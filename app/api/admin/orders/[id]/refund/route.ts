import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase'
import { requireAdmin } from '@/lib/api-auth'
import { Order, RefundMethod } from '@/lib/types'

const REFUND_METHODS: RefundMethod[] = ['cash', 'store_credit', 'original_payment_method']

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  const check = await requireAdmin()
  if ('error' in check) {
    return NextResponse.json({ error: check.error }, { status: check.status })
  }

  let body: { isFullRefund?: boolean; amount?: number; method?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { isFullRefund, amount, method } = body
  if (!method || !REFUND_METHODS.includes(method as RefundMethod)) {
    return NextResponse.json({ error: 'Invalid refund method' }, { status: 400 })
  }

  try {
    const { id } = await params
    const admin = createSupabaseAdminClient()

    const { data: orderData, error: orderErr } = await admin
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (orderErr || !orderData) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    const order = orderData as Order

    if (order.amount_paid <= 0) {
      return NextResponse.json({ error: 'Nothing has been paid on this order' }, { status: 400 })
    }

    // Recomputed server-side — never trust the client's number for what
    // actually moves through the books.
    let refundAmount: number
    if (isFullRefund) {
      refundAmount = order.amount_paid
    } else {
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: 'Enter a refund amount' }, { status: 400 })
      }
      if (round2(amount) > order.amount_paid) {
        return NextResponse.json({ error: 'Refund amount exceeds what was paid' }, { status: 400 })
      }
      refundAmount = round2(amount)
    }

    const newAmountPaid = isFullRefund ? 0 : round2(order.amount_paid - refundAmount)

    const { data: updatedOrderData, error: updateErr } = await admin
      .from('orders')
      .update({
        amount_paid: newAmountPaid,
        ...(isFullRefund ? { status: 'refunded' as const } : {}),
      })
      .eq('id', order.id)
      .select('*')
      .single()

    if (updateErr || !updatedOrderData) {
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }

    await admin.from('order_refunds').insert({
      order_id: order.id,
      amount: refundAmount,
      method: method as RefundMethod,
      is_full_refund: !!isFullRefund,
      note: isFullRefund ? null : 'Post-Sale Discount',
      created_by: check.user.id,
    })

    let storeCreditBalance: number | null = null
    if (method === 'store_credit') {
      await admin.from('store_credits').insert({
        user_id: order.user_id,
        customer_email: order.customer_email,
        amount: refundAmount,
        reason: 'refund',
        order_id: order.id,
        created_by: check.user.id,
      })

      const { data: creditRows } = await admin
        .from('store_credits')
        .select('amount')
        .ilike('customer_email', order.customer_email)

      storeCreditBalance = (creditRows ?? []).reduce((sum: number, r: { amount: number }) => sum + r.amount, 0)
    }

    return NextResponse.json({ order: updatedOrderData, refundAmount, storeCreditBalance })
  } catch (err) {
    console.error('refund error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to process refund' }, { status: 500 })
  }
}

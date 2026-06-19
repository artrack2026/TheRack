import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase'
import { requireAdmin } from '@/lib/api-auth'
import { sendEmail, isEmailConfigured } from '@/lib/email'
import { buildInvoiceHtml, shortOrderId } from '@/lib/invoice'
import { Order, OrderItem, Profile } from '@/lib/types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }
  if (!isEmailConfigured) {
    return NextResponse.json({ error: 'Email is not configured. Add RESEND_API_KEY to your environment.' }, { status: 503 })
  }

  const check = await requireAdmin()
  if ('error' in check) {
    return NextResponse.json({ error: check.error }, { status: check.status })
  }

  try {
    const { id } = await params
    const admin = createSupabaseAdminClient()

    const { data: order, error } = await admin
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', id)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('*')
      .eq('email', (order as Order).customer_email)
      .maybeSingle()

    const html = buildInvoiceHtml({
      order: order as Order & { items?: OrderItem[] },
      profile: (profile as Profile) ?? null,
    })

    await sendEmail({
      to: (order as Order).customer_email,
      subject: `Invoice #${shortOrderId((order as Order).id)} — Art-R-Ack`,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('send-invoice error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to send invoice' }, { status: 500 })
  }
}

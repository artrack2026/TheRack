import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase'
import { shortOrderId } from '@/lib/invoice'
import { checkRateLimit } from '@/lib/rate-limit'

/* GET /api/orders/[id]/payment-confirmation — public, no auth.
   Order ids are unguessable UUIDs, the same "bearer" this app already
   relies on for /checkout/success?id=... — this just extends that to a
   page a customer can revisit later, including from an emailed link
   (guest checkout has no session to check on a different device anyway). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Not configured' }, { status: 503 })

  const { id } = await params
  const admin = createSupabaseAdminClient()

  const { data: order, error } = await admin
    .from('orders')
    .select('id, total, payment_method, payment_detail, payment_instructions, payment_type, payment_redirect_url, payment_confirmation_code, payment_confirmation_submitted_at')
    .eq('id', id)
    .single()

  if (error || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  return NextResponse.json({
    orderNumber:         shortOrderId(order.id),
    total:                order.total,
    paymentMethodName:    order.payment_method,
    paymentDetail:        order.payment_detail,
    paymentInstructions:  order.payment_instructions,
    paymentType:          order.payment_type,
    paymentRedirectUrl:   order.payment_redirect_url,
    alreadySubmitted:     !!order.payment_confirmation_submitted_at,
    submittedCode:        order.payment_confirmation_code,
  })
}

/* POST /api/orders/[id]/payment-confirmation — Body: { code }
   Stores whatever the customer submits — there's no API to verify a
   Venmo/Cash App/PayPal.me transaction ID against, so this is a durable
   record for the admin reviewing the order, not proof of payment.
   Resubmitting (e.g. to fix a typo) overwrites the previous value —
   allowed on purpose, this isn't proof-of-payment so there's nothing to
   protect by locking it. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Not configured' }, { status: 503 })

  const { id } = await params

  const { allowed } = await checkRateLimit('payment_confirmation_submit', id, { limit: 10, windowMs: 60 * 60 * 1000 })
  if (!allowed) return NextResponse.json({ error: 'Too many attempts. Please try again in a bit.' }, { status: 429 })

  const { code } = await req.json()
  if (typeof code !== 'string' || !code.trim()) {
    return NextResponse.json({ error: 'Please enter a confirmation code.' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()
  const { error } = await admin
    .from('orders')
    .update({
      payment_confirmation_code: code.trim(),
      payment_confirmation_submitted_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to save confirmation code' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

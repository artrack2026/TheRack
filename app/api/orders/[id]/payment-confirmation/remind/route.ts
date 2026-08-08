import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase'
import { sendEmail, isEmailConfigured } from '@/lib/email'
import { shortOrderId, money, escapeHtml } from '@/lib/invoice'
import { checkRateLimit } from '@/lib/rate-limit'

/* POST /api/orders/[id]/payment-confirmation/remind — public, no auth.
   Fired when a customer picks "Submit Later" on the payment-confirmation
   screen. Sends a link back to that same page so they can finish from
   their email whenever they're ready — best-effort, since the order
   itself is already placed either way. Tightly rate-limited since, unlike
   the code-submission endpoint, this one sends a real email each time. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  if (!isEmailConfigured) return NextResponse.json({ error: 'Email is not configured.' }, { status: 503 })

  const { id } = await params

  const { allowed } = await checkRateLimit('payment_confirmation_remind', id, { limit: 3, windowMs: 60 * 60 * 1000 })
  if (!allowed) return NextResponse.json({ error: 'Too many reminder requests. Please try again later.' }, { status: 429 })

  const admin = createSupabaseAdminClient()

  const { data: order, error } = await admin
    .from('orders')
    .select('id, customer_name, customer_email, total, payment_method, payment_confirmation_submitted_at')
    .eq('id', id)
    .single()

  if (error || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.payment_confirmation_submitted_at) return NextResponse.json({ ok: true, alreadySubmitted: true })

  const orderNumber = shortOrderId(order.id)
  const confirmUrl  = `${req.nextUrl.origin}/orders/${order.id}/confirm-payment`
  const firstName   = order.customer_name?.split(' ')[0] || 'there'

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#222;max-width:480px;margin:0 auto;">
    <h2 style="margin:0 0 12px;">One more step for Order #${orderNumber}</h2>
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>Thanks for your order — we're just waiting on your payment confirmation before we can verify it and get things moving.</p>
    <p style="margin:24px 0;">
      <a href="${confirmUrl}" style="display:inline-block;padding:12px 22px;background:#bf5b4a;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">
        Submit Payment Confirmation
      </a>
    </p>
    <p style="font-size:13px;color:#666;margin:0 0 4px;">
      Order total: ${money(order.total)}${order.payment_method ? ` · Paid via ${escapeHtml(order.payment_method)}` : ''}
    </p>
    <p style="font-size:13px;color:#666;">
      Submitting your confirmation code (transaction ID, reference number, etc.) as soon as you have it helps us
      verify and ship your order faster.
    </p>
  </div>
  `

  try {
    await sendEmail({
      to: order.customer_email,
      subject: `Action needed: confirm your payment for Order #${orderNumber} — Art-R-Ack`,
      html,
    })
  } catch (err) {
    console.error('Failed to send payment reminder email:', err)
    return NextResponse.json({ error: 'Failed to send reminder email' }, { status: 500 })
  }

  await admin.from('orders').update({ payment_reminder_sent_at: new Date().toISOString() }).eq('id', id)
  return NextResponse.json({ ok: true })
}

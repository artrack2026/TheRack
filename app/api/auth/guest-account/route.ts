import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const MAX_ORDER_AGE_MS = 10 * 60 * 1000

/** Auto-provisions a customer account right after a guest checkout completes,
 *  and hands back a one-time magic-link token so the client can establish a
 *  real session immediately — no password is ever shown to the customer.
 *
 *  Gated to a real, very-recent order (matched by id + email) so this can't
 *  be used to spin up accounts for arbitrary email addresses. */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const { allowed } = await checkRateLimit('guest_account', getClientIp(req), { limit: 5, windowMs: 60 * 60 * 1000 })
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const body = await req.json()
  const {
    orderId, email, firstName, lastName, phone,
    address_line1, address_line2, city, state, zip,
  } = body

  if (!orderId || !email) {
    return NextResponse.json({ error: 'orderId and email are required' }, { status: 400 })
  }

  const normalizedEmail = String(email).toLowerCase().trim()
  const admin = createSupabaseAdminClient()

  const { data: order } = await admin
    .from('orders')
    .select('id, customer_email, created_at')
    .eq('id', orderId)
    .single()

  if (!order || order.customer_email.toLowerCase() !== normalizedEmail) {
    return NextResponse.json({ error: 'Order does not match' }, { status: 400 })
  }
  if (Date.now() - new Date(order.created_at).getTime() > MAX_ORDER_AGE_MS) {
    return NextResponse.json({ error: 'Order is too old' }, { status: 400 })
  }

  // Random password the customer never sees — they sign in via the
  // one-time magic link below, or "forgot password" on a future visit.
  const tempPassword = crypto.randomBytes(24).toString('base64url')

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password: tempPassword,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    /* Most likely cause: an account with this email already exists.
       Can't auto-login into it without their password — that's fine,
       they can sign in normally and their existing account is unaffected. */
    return NextResponse.json({ ok: true, created: false })
  }

  await admin.from('profiles').upsert([{
    id:            authData.user.id,
    email:         normalizedEmail,
    first_name:    firstName || null,
    last_name:     lastName || null,
    display_name:  firstName || null,
    phone:         phone || null,
    address_line1: address_line1 || null,
    address_line2: address_line2 || null,
    city:          city || null,
    state:         state || null,
    zip:           zip || null,
    role:          'customer',
  }])

  await admin.from('orders').update({ user_id: authData.user.id }).eq('id', orderId)

  const { data: linkData } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: normalizedEmail,
  })

  return NextResponse.json({
    ok: true,
    created: true,
    tokenHash: linkData?.properties?.hashed_token ?? null,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

/* POST /api/auth/forgot-password — public, self-service.
   Body: { email }
   Always responds with { ok: true } regardless of whether the email
   actually matches an account — same anti-enumeration behavior Supabase's
   own resetPasswordForEmail already has, kept consistent here rather than
   letting a client-visible error leak which emails are registered.
   Lands on the same /auth/change-password page the admin-triggered
   "Send Reset Link" flow already uses (app/api/admin/users/reset-password) —
   one shared "set a new password" destination for both paths. */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const { email } = await req.json()
  if (typeof email !== 'string' || !email.trim() || !email.includes('@')) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  const normalizedEmail = email.toLowerCase().trim()

  // Rate-limited by email (protects the account owner's inbox from being
  // bombed with reset links) and by IP (slows down scripted abuse across
  // many addresses) — either tripping blocks the request.
  const [byEmail, byIp] = await Promise.all([
    checkRateLimit('forgot_password_email', normalizedEmail, { limit: 3, windowMs: 15 * 60 * 1000 }),
    checkRateLimit('forgot_password_ip', getClientIp(req), { limit: 10, windowMs: 15 * 60 * 1000 }),
  ])
  if (!byEmail.allowed || !byIp.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again in a bit.' }, { status: 429 })
  }

  const admin = createSupabaseAdminClient()
  const { error } = await admin.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${req.nextUrl.origin}/auth/change-password`,
  })
  // Swallow the error rather than surface it — the only errors this
  // realistically throws are things like malformed input (already
  // validated above) or provider-side hiccups, and surfacing either would
  // either leak account existence or just confuse a customer who did
  // everything right. Logged for our own visibility, not theirs.
  if (error) console.error('resetPasswordForEmail error:', error.message)

  return NextResponse.json({ ok: true })
}

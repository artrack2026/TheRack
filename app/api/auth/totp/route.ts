import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient, createSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase'
import { generateTotpEnrollment, verifyTotpCode } from '@/lib/totp'

/** All three verbs act on the caller's own account only — TOTP is a
 *  self-service security setting, not something an admin sets on someone
 *  else's behalf (unlike phone-verify, which supports an admin-on-behalf
 *  path for the SMS 2FA number). */
async function requireUser() {
  const cookieStore = await cookies()
  const supabase    = createSupabaseServerClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/* POST /api/auth/totp — start (or restart) enrollment.
   Returns a QR code + the secret for manual entry. Stored as *pending* —
   totp_enabled stays false until PATCH confirms a real code from the app. */
export async function POST() {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const user = await requireUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const enrollment = await generateTotpEnrollment(user.email)

  const admin = createSupabaseAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ totp_secret_encrypted: enrollment.encryptedSecret, totp_enabled: false })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ qrDataUrl: enrollment.qrDataUrl, secret: enrollment.base32Secret })
}

/* PATCH /api/auth/totp — confirm enrollment with a code from the app.
   Body: { code } */
export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await req.json()
  if (typeof code !== 'string' || !code.trim()) {
    return NextResponse.json({ error: 'Verification code is required' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()
  const { data: row } = await admin
    .from('profiles')
    .select('totp_secret_encrypted')
    .eq('id', user.id)
    .single()

  if (!row?.totp_secret_encrypted) {
    return NextResponse.json({ error: 'No pending authenticator setup. Start over.' }, { status: 400 })
  }

  if (!verifyTotpCode(row.totp_secret_encrypted, code)) {
    return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 401 })
  }

  const { error } = await admin.from('profiles').update({ totp_enabled: true }).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

/* DELETE /api/auth/totp — remove the authenticator app as a 2FA method. */
export async function DELETE() {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createSupabaseAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ totp_secret_encrypted: null, totp_enabled: false })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

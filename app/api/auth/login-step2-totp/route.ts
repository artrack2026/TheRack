import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase'
import { verifyTotpCode } from '@/lib/totp'

const MAX_ATTEMPTS = 5

/** Step 2 of login when the authenticator-app channel was offered: verifies
 *  the submitted code against the account's live TOTP secret (no
 *  pre-generated code to check against, unlike SMS/email — the code itself
 *  is time-derived). On success, the client re-runs the real
 *  signInWithPassword to establish the persisted session, same as the SMS
 *  path. */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const { challengeId, code } = await req.json()
  if (typeof challengeId !== 'string' || typeof code !== 'string' || !challengeId || !code) {
    return NextResponse.json({ error: 'Verification code is required' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  const { data: challenge } = await admin
    .from('login_totp_challenges')
    .select('*')
    .eq('id', challengeId)
    .single()

  if (!challenge) {
    return NextResponse.json({ error: 'Verification expired. Please log in again.' }, { status: 400 })
  }

  if (new Date(challenge.expires_at) < new Date()) {
    await admin.from('login_totp_challenges').delete().eq('id', challengeId)
    return NextResponse.json({ error: 'Verification expired. Please log in again.' }, { status: 400 })
  }

  if (challenge.attempts >= MAX_ATTEMPTS) {
    await admin.from('login_totp_challenges').delete().eq('id', challengeId)
    return NextResponse.json({ error: 'Too many incorrect attempts. Please log in again.' }, { status: 429 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('totp_secret_encrypted')
    .eq('id', challenge.user_id)
    .single()

  if (!profile?.totp_secret_encrypted || !verifyTotpCode(profile.totp_secret_encrypted, code)) {
    await admin.from('login_totp_challenges').update({ attempts: challenge.attempts + 1 }).eq('id', challengeId)
    return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 401 })
  }

  await admin.from('login_totp_challenges').delete().eq('id', challengeId)
  return NextResponse.json({ ok: true })
}

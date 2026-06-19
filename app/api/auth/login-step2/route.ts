import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase'

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

const MAX_ATTEMPTS = 5

/** Step 2 of login: verify the SMS code against the challenge created in
 *  step 1. On success, the client re-runs the real signInWithPassword to
 *  establish the persisted session — this route only confirms the code. */
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
    .from('login_otp_challenges')
    .select('*')
    .eq('id', challengeId)
    .single()

  if (!challenge) {
    return NextResponse.json({ error: 'Verification expired. Please log in again.' }, { status: 400 })
  }

  if (new Date(challenge.expires_at) < new Date()) {
    await admin.from('login_otp_challenges').delete().eq('id', challengeId)
    return NextResponse.json({ error: 'Verification code expired. Please log in again.' }, { status: 400 })
  }

  if (challenge.attempts >= MAX_ATTEMPTS) {
    await admin.from('login_otp_challenges').delete().eq('id', challengeId)
    return NextResponse.json({ error: 'Too many incorrect attempts. Please log in again.' }, { status: 429 })
  }

  if (hashCode(code.trim()) !== challenge.code_hash) {
    await admin.from('login_otp_challenges').update({ attempts: challenge.attempts + 1 }).eq('id', challengeId)
    return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 401 })
  }

  await admin.from('login_otp_challenges').delete().eq('id', challengeId)
  return NextResponse.json({ ok: true })
}

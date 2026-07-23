import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createSupabaseServerClient, createSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase'

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

const MAX_ATTEMPTS = 5

/** Step 2 of phone-change verification: checks the code against the
 *  challenge from /request, and only then writes new_phone to the profile —
 *  the phone is never saved until the number it's changing to is confirmed
 *  reachable. */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const cookieStore = await cookies()
  const supabase     = createSupabaseServerClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { challengeId, code } = await req.json()
  if (typeof challengeId !== 'string' || typeof code !== 'string' || !challengeId || !code) {
    return NextResponse.json({ error: 'Verification code is required' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  const { data: challenge } = await admin
    .from('phone_change_challenges')
    .select('*')
    .eq('id', challengeId)
    .single()

  if (!challenge) {
    return NextResponse.json({ error: 'Verification expired. Please request a new code.' }, { status: 400 })
  }

  if (challenge.user_id !== user.id) {
    const { data: requesterProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (requesterProfile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (new Date(challenge.expires_at) < new Date()) {
    await admin.from('phone_change_challenges').delete().eq('id', challengeId)
    return NextResponse.json({ error: 'Verification code expired. Please request a new code.' }, { status: 400 })
  }

  if (challenge.attempts >= MAX_ATTEMPTS) {
    await admin.from('phone_change_challenges').delete().eq('id', challengeId)
    return NextResponse.json({ error: 'Too many incorrect attempts. Please request a new code.' }, { status: 429 })
  }

  if (hashCode(code.trim()) !== challenge.code_hash) {
    await admin.from('phone_change_challenges').update({ attempts: challenge.attempts + 1 }).eq('id', challengeId)
    return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 401 })
  }

  const { error: updateError } = await admin
    .from('profiles')
    .update({ phone: challenge.new_phone })
    .eq('id', challenge.user_id)

  await admin.from('phone_change_challenges').delete().eq('id', challengeId)

  if (updateError) {
    return NextResponse.json({ error: 'Verified, but saving the new number failed. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, phone: challenge.new_phone })
}

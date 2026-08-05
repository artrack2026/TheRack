import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createSupabaseServerClient, createSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase'
import { toTextbeltPhone, maskPhone } from '@/lib/format'
import { maybeAlertLowTextbeltBalance } from '@/lib/textbelt-alert'

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

const COOLDOWN_MS = 60 * 1000

/** Step 1 of phone-change verification: texts a one-time code to the NEW
 *  number before it's ever written to profiles, so a typo or wrong number
 *  can't lock someone out of SMS-based 2FA login. Only relevant when 2FA is
 *  enabled — callers should just save the phone directly otherwise.
 *
 *  Body: { newPhone: string, userId?: string }
 *  Omitting userId verifies the caller's own phone. Passing a different
 *  userId is an admin-on-behalf change and requires the caller to be an admin.
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const cookieStore = await cookies()
  const supabase     = createSupabaseServerClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { newPhone, userId } = await req.json()
  if (typeof newPhone !== 'string' || toTextbeltPhone(newPhone).length !== 10) {
    return NextResponse.json({ error: 'Enter a valid 10-digit phone number.' }, { status: 400 })
  }

  let targetUserId = user.id
  if (typeof userId === 'string' && userId !== user.id) {
    const { data: requesterProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (requesterProfile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    targetUserId = userId
  }

  const admin = createSupabaseAdminClient()

  const { data: settingsRow } = await admin
    .from('showroom_settings')
    .select('two_factor_enabled')
    .eq('id', 1)
    .single()

  /* 2FA off — a wrong number can't lock anyone out of a login step that
     doesn't exist, so there's nothing to verify. The caller saves directly. */
  if (!settingsRow?.two_factor_enabled) {
    return NextResponse.json({ ok: true, required: false })
  }

  const { data: existing } = await admin
    .from('phone_change_challenges')
    .select('created_at')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing && Date.now() - new Date(existing.created_at).getTime() < COOLDOWN_MS) {
    return NextResponse.json({ error: 'Please wait a moment before requesting another code.' }, { status: 429 })
  }

  const key = process.env.TEXTBELT_API_KEY
  if (!key) {
    return NextResponse.json(
      { error: 'SMS verification is not configured right now. Contact support to update this phone number.' },
      { status: 503 }
    )
  }

  /* Invalidate any previous outstanding challenge for this profile */
  await admin.from('phone_change_challenges').delete().eq('user_id', targetUserId)

  const code      = String(crypto.randomInt(100000, 1000000))
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  const { data: challenge, error: insertError } = await admin
    .from('phone_change_challenges')
    .insert([{
      user_id:      targetUserId,
      requested_by: user.id,
      new_phone:    newPhone,
      code_hash:    hashCode(code),
      expires_at:   expiresAt,
    }])
    .select('id')
    .single()

  if (insertError || !challenge) {
    return NextResponse.json({ error: 'Failed to start verification. Please try again.' }, { status: 500 })
  }

  try {
    const sendRes = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone:   toTextbeltPhone(newPhone),
        message: `Your ArtRAck verification code is ${code}. It expires in 5 minutes.`,
        key,
      }),
    })
    const sendData = await sendRes.json()

    if (!sendData.success) {
      await admin.from('phone_change_challenges').delete().eq('id', challenge.id)
      return NextResponse.json(
        { error: sendData.error || 'Unable to send a verification text. Please check the number and try again.' },
        { status: 502 }
      )
    }

    const quotaRemaining = typeof sendData.quotaRemaining === 'number'
      ? sendData.quotaRemaining
      : typeof sendData.quota_remaining === 'number' ? sendData.quota_remaining : null
    await maybeAlertLowTextbeltBalance(quotaRemaining)
  } catch {
    await admin.from('phone_change_challenges').delete().eq('id', challenge.id)
    return NextResponse.json({ error: 'Unable to send a verification text. Please try again shortly.' }, { status: 502 })
  }

  return NextResponse.json({
    ok:          true,
    required:    true,
    challengeId: challenge.id,
    maskedPhone: maskPhone(newPhone),
  })
}

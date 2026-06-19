import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { createSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase'
import { toTextbeltPhone, maskPhone } from '@/lib/format'

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

/** Step 1 of login: verify email/password without creating a persisted
 *  session, then — if 2FA is enabled — text a one-time code via Textbelt
 *  and hand back a challenge id. If SMS can't be sent for any reason (no
 *  phone on file, Textbelt not configured, quota exhausted, send error),
 *  this falls back to emailing a code via Supabase Auth instead — so a
 *  dead phone number or an empty Textbelt balance never locks anyone out,
 *  including an admin who needs back in to fix it.
 *  The real Supabase session is only established client-side, in step 2
 *  (or immediately here, if 2FA doesn't apply). */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const { email, password } = await req.json()
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  /* Throwaway client — confirms the password is correct without writing
     any cookies, so nothing is "logged in" yet at this point. */
  const probe = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: signInData, error: signInError } = await probe.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })

  if (signInError || !signInData.user) {
    return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 })
  }

  const userId = signInData.user.id
  const admin  = createSupabaseAdminClient()

  const { data: settingsRow } = await admin
    .from('showroom_settings')
    .select('two_factor_enabled')
    .eq('id', 1)
    .single()

  if (!settingsRow?.two_factor_enabled) {
    return NextResponse.json({ ok: true, requiresOtp: false })
  }

  /* Email fallback — used whenever SMS isn't an option. Supabase Auth owns
     the code generation/expiry/verification for this channel, so there's
     nothing for us to store. shouldCreateUser:false since we already know
     this account exists. */
  const sendEmailFallback = async () => {
    const { error: emailError } = await probe.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: false },
    })
    if (emailError) {
      return NextResponse.json(
        { error: 'Unable to send a verification code by text or email. Please try again shortly or contact support.' },
        { status: 502 }
      )
    }
    return NextResponse.json({ ok: true, requiresOtp: true, channel: 'email' as const, maskedEmail: normalizedEmail })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('phone')
    .eq('id', userId)
    .single()

  const phone = profile?.phone as string | null | undefined
  const key   = process.env.TEXTBELT_API_KEY

  /* No phone on file, or Textbelt isn't configured — go straight to email. */
  if (!phone || !key) {
    return sendEmailFallback()
  }

  /* Invalidate any previous outstanding codes for this user */
  await admin.from('login_otp_challenges').delete().eq('user_id', userId)

  const code      = String(crypto.randomInt(100000, 1000000))
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  const { data: challenge, error: insertError } = await admin
    .from('login_otp_challenges')
    .insert([{ user_id: userId, code_hash: hashCode(code), expires_at: expiresAt }])
    .select('id')
    .single()

  if (insertError || !challenge) {
    return NextResponse.json({ error: 'Failed to start verification. Please try again.' }, { status: 500 })
  }

  try {
    const sendRes  = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: toTextbeltPhone(phone),
        message: `Your ArtRAck verification code is ${code}. It expires in 5 minutes.`,
        key,
      }),
    })
    const sendData = await sendRes.json()

    if (!sendData.success) {
      await admin.from('login_otp_challenges').delete().eq('id', challenge.id)
      return sendEmailFallback()
    }
  } catch {
    await admin.from('login_otp_challenges').delete().eq('id', challenge.id)
    return sendEmailFallback()
  }

  return NextResponse.json({
    ok: true,
    requiresOtp: true,
    channel: 'sms' as const,
    challengeId: challenge.id,
    maskedPhone: maskPhone(phone),
  })
}

'use client'

import { useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader, ShieldCheck, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import ParticleField from '@/components/ParticleField'
import { useAuth } from '@/components/AuthProvider'
import { getSupabaseClient } from '@/lib/supabase'

function LoginForm() {
  const { signIn } = useAuth()
  const router     = useRouter()
  const params     = useSearchParams()
  const hasFrom    = params.has('from')
  const from       = params.get('from') || '/portal'

  const [form, setForm]         = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  /* ── 2FA step ── */
  const [channel, setChannel]           = useState<'sms' | 'email' | 'totp' | null>(null)
  const [challengeId, setChallengeId]   = useState<string | null>(null)
  const [maskedPhone, setMaskedPhone]   = useState<string | null>(null)
  const [otp, setOtp]                   = useState('')
  const [verifying, setVerifying]       = useState(false)
  const [otpError, setOtpError]         = useState<string | null>(null)
  const [switchingChannel, setSwitchingChannel] = useState(false)

  /* Redirect after a session already exists — shared by every path that
     successfully establishes auth (no-2FA, SMS-verified, email-verified). */
  const redirectAfterAuth = async () => {
    // Small delay ensures cookies are written before navigation
    // Prevents race condition between client and server auth state
    await new Promise(resolve => setTimeout(resolve, 100))

    // Not bounced from a specific protected page — send admins straight
    // to their dashboard instead of the customer portal
    let destination = from
    if (!hasFrom) {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile?.role === 'admin') destination = '/admin'
      }
    }
    router.push(destination)
  }

  /* SMS path: our own challenge is already verified server-side at this
     point, so the password is re-run to establish the real session. */
  const completeLogin = async () => {
    const err = await signIn(form.email.toLowerCase().trim(), form.password)
    if (err) {
      setError('Something went wrong finishing sign-in. Please try again.')
      setChannel(null)
      setChallengeId(null)
      return
    }
    await redirectAfterAuth()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res  = await fetch('/api/auth/login-step1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.toLowerCase().trim(), password: form.password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(
          (data.error ?? '').toLowerCase().includes('invalid')
            ? 'Incorrect email or password. Please try again.'
            : data.error || 'Unable to sign in. Please try again.'
        )
        setLoading(false)
        return
      }

      if (!data.requiresOtp) {
        await completeLogin()
        setLoading(false)
        return
      }

      setChannel(data.channel)
      setChallengeId(data.challengeId ?? null)
      setMaskedPhone(data.maskedPhone ?? null)
      setLoading(false)
    } catch {
      setError('Unable to sign in. Please try again.')
      setLoading(false)
    }
  }

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    setOtpError(null)
    setVerifying(true)

    try {
      if (channel === 'email') {
        const supabase = getSupabaseClient()
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: form.email.toLowerCase().trim(),
          token: otp.trim(),
          type: 'email',
        })
        if (verifyError) {
          setOtpError('Incorrect or expired code. Please try again.')
          setVerifying(false)
          return
        }
        // Email OTP already establishes the real session — no password re-run needed
        await redirectAfterAuth()
        setVerifying(false)
        return
      }

      if (!challengeId) return
      const endpoint = channel === 'totp' ? '/api/auth/login-step2-totp' : '/api/auth/login-step2'
      const res  = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, code: otp.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setOtpError(data.error || 'Incorrect code. Please try again.')
        setVerifying(false)
        return
      }

      await completeLogin()
      setVerifying(false)
    } catch {
      setOtpError('Unable to verify code. Please try again.')
      setVerifying(false)
    }
  }

  /* Voluntary switch — lets someone on the SMS step bail out to email if
     their phone isn't receiving texts, without waiting for the code to
     time out first. */
  const handleSwitchToEmail = async () => {
    setSwitchingChannel(true)
    setOtpError(null)
    try {
      const supabase = getSupabaseClient()
      const { error: emailError } = await supabase.auth.signInWithOtp({
        email: form.email.toLowerCase().trim(),
        options: { shouldCreateUser: false },
      })
      if (emailError) {
        setOtpError('Unable to send an email code. Please try again.')
        setSwitchingChannel(false)
        return
      }
      setChannel('email')
      setChallengeId(null)
      setOtp('')
    } catch {
      setOtpError('Unable to send an email code. Please try again.')
    } finally {
      setSwitchingChannel(false)
    }
  }

  const backToCredentials = () => {
    setChannel(null)
    setChallengeId(null)
    setMaskedPhone(null)
    setOtp('')
    setOtpError(null)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-20">
      <ParticleField />

      {/* Background bloom */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(200,144,42,0.05) 0%, transparent 70%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo lives in the persistent navbar above — this page just needs the context line. */}
        <div className="text-center mb-8">
          <p className="text-xs tracking-[0.3em] uppercase font-semibold" style={{ color: 'var(--color-accent)' }}>
            Welcome Back
          </p>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {channel ? 'Enter your verification code' : 'Sign in to your account'}
          </p>
        </div>

        {/* Card */}
        <div
          className="p-8 input-tint-rose"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '18px',
          }}
        >
          {channel ? (
            <form onSubmit={handleVerify} className="flex flex-col gap-5">
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <ShieldCheck size={16} style={{ color: 'var(--color-accent)' }} />
                {channel === 'sms'
                  ? <>We texted a 6-digit code to {maskedPhone ?? 'your phone'}.</>
                  : channel === 'totp'
                  ? <>Enter the 6-digit code from your authenticator app.</>
                  : <>We emailed a 6-digit code to {form.email.toLowerCase().trim()}.</>
                }
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
                  Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  className="cyber-input text-center"
                  style={{ fontSize: '1.4rem', letterSpacing: '0.4em' }}
                  placeholder="••••••"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>

              {otpError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg"
                  style={{ background: 'rgba(224,88,88,0.1)', color: 'var(--r-red)', border: '1px solid rgba(224,88,88,0.25)' }}
                >
                  <AlertCircle size={14} />
                  {otpError}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={verifying || otp.length !== 6}
                className="cyber-btn w-full justify-center"
              >
                {verifying ? <><Loader size={15} className="animate-spin" /> Verifying…</> : 'Verify & Sign In'}
              </button>

              {(channel === 'sms' || channel === 'totp') && (
                <button
                  type="button"
                  onClick={handleSwitchToEmail}
                  disabled={switchingChannel}
                  className="flex items-center justify-center gap-1.5 text-xs tracking-widest uppercase"
                  style={{ color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <Mail size={12} />
                  {switchingChannel
                    ? 'Sending…'
                    : channel === 'totp' ? 'Lost your authenticator app? Email me a code' : "Didn't get a text? Email me a code"}
                </button>
              )}

              <button
                type="button"
                onClick={backToCredentials}
                className="flex items-center justify-center gap-1.5 text-xs tracking-widest uppercase"
                style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <ArrowLeft size={12} /> Back
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
                  Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                  <input
                    type="text"
                    required
                    autoComplete="email"
                    className="cyber-input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Uppercase or lowercase — either works
                </p>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    className="cyber-input"
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg"
                  style={{ background: 'rgba(224,88,88,0.1)', color: 'var(--r-red)', border: '1px solid rgba(224,88,88,0.25)' }}
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="cyber-btn w-full justify-center"
                style={{ marginTop: '4px' }}
              >
                {loading ? (
                  <><Loader size={15} className="animate-spin" /> Signing in…</>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs mt-5" style={{ color: 'var(--color-text-muted)' }}>
          Accounts are created by invitation after your first purchase.{' '}
          <Link href="/contact" className="underline hover:opacity-80" style={{ color: 'var(--color-accent)' }}>
            Questions?
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

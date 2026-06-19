'use client'

import { useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader, ShieldCheck, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import LogoText from '@/components/LogoText'
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
  const [challengeId, setChallengeId]   = useState<string | null>(null)
  const [maskedPhone, setMaskedPhone]   = useState<string | null>(null)
  const [otp, setOtp]                   = useState('')
  const [verifying, setVerifying]       = useState(false)
  const [otpError, setOtpError]         = useState<string | null>(null)

  /* Establishes the real, cookie-persisted Supabase session and redirects —
     shared by the no-2FA path and the post-OTP path. */
  const completeLogin = async () => {
    const err = await signIn(form.email.toLowerCase().trim(), form.password)
    if (err) {
      setError('Something went wrong finishing sign-in. Please try again.')
      setChallengeId(null)
      return
    }

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

      setChallengeId(data.challengeId)
      setMaskedPhone(data.maskedPhone)
      setLoading(false)
    } catch {
      setError('Unable to sign in. Please try again.')
      setLoading(false)
    }
  }

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    if (!challengeId) return
    setOtpError(null)
    setVerifying(true)

    try {
      const res  = await fetch('/api/auth/login-step2', {
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

  const backToCredentials = () => {
    setChallengeId(null)
    setMaskedPhone(null)
    setOtp('')
    setOtpError(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
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
        className="relative w-full max-w-sm"
      >
        {/* Logo — Option B: logo → line → water reflection below */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block" style={{ lineHeight: 1 }}>
            <div>
              <LogoText className="text-3xl" />
            </div>
            <div style={{
              height: '1.5px',
              margin: '5px 0 4px',
              background: 'linear-gradient(90deg, transparent, #d4b030, #3ab870, #1ab4c0, transparent)',
            }} />
            <div style={{
              transform: 'scaleY(-1)',
              opacity: 0.45,
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 90%)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 90%)',
              pointerEvents: 'none',
              display: 'block',
            }}>
              <LogoText className="text-3xl" />
            </div>
          </Link>

          <p className="mt-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {challengeId ? 'Enter your verification code' : 'Sign in to your account'}
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
          {challengeId ? (
            <form onSubmit={handleVerify} className="flex flex-col gap-5">
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <ShieldCheck size={16} style={{ color: 'var(--color-accent)' }} />
                We texted a 6-digit code to {maskedPhone ?? 'your phone'}.
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

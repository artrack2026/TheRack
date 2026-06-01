'use client'

import { useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader } from 'lucide-react'
import Link from 'next/link'
import LogoText from '@/components/LogoText'
import { useAuth } from '@/components/AuthProvider'

function LoginForm() {
  const { signIn } = useAuth()
  const router     = useRouter()
  const params     = useSearchParams()
  const from       = params.get('from') || '/portal'

  const [form, setForm]         = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    /* ── Email normalized to lowercase before comparison ── */
    const err = await signIn(form.email.toLowerCase().trim(), form.password)

    if (err) {
      /* Friendly message — don't expose internal Supabase strings */
      setError(
        err.toLowerCase().includes('invalid')
          ? 'Incorrect email or password. Please try again.'
          : err
      )
      setLoading(false)
    } else {
      // refresh() lets Next.js sync the session cookie before navigating
      router.refresh()
      router.push(from)
    }
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
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <LogoText className="text-3xl" />
          </Link>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Sign in to your account
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
          {/* Rainbow top stripe */}
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{
              background: 'linear-gradient(90deg,#e05858,#e07838,#d4b030,#3ab870,#1ab4c0,#3878e0,#8844d8,#d84490)',
              borderRadius: '18px 18px 0 0',
            }}
          />

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
                  className="cyber-input pl-11"
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
                  className="cyber-input pl-11 pr-10"
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
        </div>

        <p className="text-center text-xs mt-5" style={{ color: 'var(--color-text-muted)' }}>
          Accounts are created by invitation after your first purchase.{' '}
          <Link href="/contact" className="underline hover:opacity-80" style={{ color: 'var(--color-primary)' }}>
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

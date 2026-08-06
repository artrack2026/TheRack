'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Loader, AlertCircle, CheckCircle, Lock, Eye, EyeOff } from 'lucide-react'
import ParticleField from '@/components/ParticleField'
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase'

/** Shared landing point for setting a new password — reached two ways:
 *  1. A self-directed reset: clicking the link Supabase emails from
 *     "Send Reset Link" (app/api/admin/users/reset-password/route.ts).
 *  2. A forced stop: profiles.must_change_password is true after an admin
 *     sets a temporary password, so AdminLayout/PortalLayout redirect here
 *     on the next login before /admin or /portal become reachable.
 *  Both cases converge on the same thing once here — an authenticated
 *  session already exists (from the recovery link or the normal login),
 *  and supabase.auth.updateUser({ password }) works identically either
 *  way. This page doesn't rely on the global AuthProvider's loading/user
 *  transition, since a freshly-arrived recovery link can resolve its
 *  session a moment after AuthProvider's own initial check — a local
 *  listener avoids flashing an "expired" state during that gap. */
export default function ChangePasswordPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'waiting' | 'ready' | 'expired'>('waiting')
  const [userId, setUserId] = useState<string | null>(null)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [done, setDone]         = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) { setStatus('expired'); return }
    const supabase = getSupabaseClient()
    const timeout = setTimeout(() => setStatus(s => s === 'waiting' ? 'expired' : s), 8000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) { clearTimeout(timeout); setUserId(session.user.id); setStatus('ready') }
    })

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) { clearTimeout(timeout); setUserId(data.user.id); setStatus('ready') }
    })

    return () => { clearTimeout(timeout); subscription.unsubscribe() }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords don’t match'); return }

    setSaving(true)
    const supabase = getSupabaseClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) { setError(updateError.message); setSaving(false); return }

    // Clears the forced-change flag if it was set — a harmless no-op when
    // it wasn't (a self-directed reset never sets it in the first place).
    let destination = '/portal'
    if (userId) {
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', userId)
      const { data: profileRow } = await supabase.from('profiles').select('role').eq('id', userId).single()
      if (profileRow?.role === 'admin') destination = '/admin'
    }

    setSaving(false)
    setDone(true)
    setTimeout(() => router.replace(destination), 1800)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-20">
      <ParticleField />
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="p-8" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '18px' }}>
          {status === 'waiting' && (
            <div className="flex flex-col items-center gap-3 text-center py-4">
              <Loader size={28} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Verifying…</p>
            </div>
          )}

          {status === 'expired' && (
            <div className="flex flex-col items-center gap-3 text-center py-4">
              <AlertCircle size={28} style={{ color: 'var(--r-red)' }} />
              <p className="font-bold" style={{ color: 'var(--color-text)' }}>This link has expired</p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Sign in again, or ask for a new reset link.
              </p>
              <Link href="/login" className="cyber-btn text-sm mt-2">Back to Login</Link>
            </div>
          )}

          {status === 'ready' && done && (
            <div className="flex flex-col items-center gap-3 text-center py-4">
              <CheckCircle size={28} style={{ color: 'var(--r-green)' }} />
              <p className="font-bold" style={{ color: 'var(--color-text)' }}>Password updated</p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Redirecting…</p>
            </div>
          )}

          {status === 'ready' && !done && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="text-center mb-1">
                <p className="text-xs tracking-[0.3em] uppercase font-semibold" style={{ color: 'var(--color-accent)' }}>
                  Set a New Password
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
                  New Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    className="cyber-input"
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
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

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
                  Confirm Password
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  className="cyber-input"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg" style={{ background: 'rgba(224,88,88,0.1)', color: 'var(--r-red)', border: '1px solid rgba(224,88,88,0.25)' }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <button type="submit" disabled={saving} className="cyber-btn w-full justify-center">
                {saving ? <><Loader size={15} className="animate-spin" /> Saving…</> : 'Set Password'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}

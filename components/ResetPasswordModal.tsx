'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, KeyRound, Loader, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'

interface TargetUser {
  id: string
  email: string
}

interface Props {
  user: TargetUser | null
  onClose: () => void
}

type Mode = 'choose' | 'temporary'

export default function ResetPasswordModal({ user, onClose }: Props) {
  const [mode, setMode]         = useState<Mode>('choose')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setMode('choose')
      setPassword('')
      setShowPass(false)
      setSending(false)
      setError(null)
      setSuccess(null)
    }
  }, [user])

  const post = async (body: Record<string, unknown>) => {
    if (!user) return
    setSending(true)
    setError(null)
    const res = await fetch('/api/admin/users/reset-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: user.id, ...body }),
    })
    const data = await res.json()
    setSending(false)
    if (!res.ok) { setError(data.error ?? 'Something went wrong'); return }
    return true
  }

  const handleSendLink = async () => {
    if (!(await post({ method: 'link' }))) return
    setSuccess(`Reset link sent to ${user!.email}.`)
  }

  const handleSetTemporary = async () => {
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (!(await post({ method: 'temporary', password }))) return
    setSuccess(`Temporary password set. ${user!.email} will be required to change it on next login.`)
  }

  return (
    <AnimatePresence>
      {user && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            className="w-full max-w-md overflow-y-auto"
            style={{ maxHeight: '85vh', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '18px' }}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <KeyRound size={16} style={{ color: 'var(--color-accent)' }} />
                <p className="font-bold truncate" style={{ color: 'var(--color-text)' }}>Reset Password — {user?.email}</p>
              </div>
              <button onClick={onClose} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              {success ? (
                <div className="flex items-start gap-2.5 text-sm p-3 rounded-lg" style={{ background: 'rgba(58,184,112,0.1)', border: '1px solid rgba(58,184,112,0.25)', color: 'var(--color-text)' }}>
                  <CheckCircle size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--r-green)' }} />
                  {success}
                </div>
              ) : mode === 'choose' ? (
                <>
                  <button
                    type="button"
                    onClick={handleSendLink}
                    disabled={sending}
                    className="p-4 text-left rounded-xl transition-colors"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                  >
                    <p className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                      {sending ? <Loader size={14} className="animate-spin" /> : <Send size={14} style={{ color: 'var(--color-accent)' }} />}
                      Send Reset Link
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      Emails a password reset link to {user?.email}. Nothing changes until they click it and set their own password.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('temporary')}
                    disabled={sending}
                    className="p-4 text-left rounded-xl transition-colors"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                  >
                    <p className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                      <KeyRound size={14} style={{ color: 'var(--r-violet)' }} />
                      Set Temporary Password
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      Enter a password yourself. They&apos;ll be required to change it the next time they log in.
                    </p>
                  </button>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
                      Temporary Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        className="cyber-input pr-10"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      At least 6 characters. Share it with {user?.email} through a secure channel — they&apos;ll set their own password on first login.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={handleSetTemporary} disabled={sending || password.length < 6} className="cyber-btn text-sm">
                      {sending ? <><Loader size={13} className="animate-spin" /> Setting…</> : <><KeyRound size={13} /> Set Password</>}
                    </button>
                    <button type="button" onClick={() => setMode('choose')} disabled={sending} className="cyber-btn art-btn-ghost text-sm">
                      Back
                    </button>
                  </div>
                </>
              )}

              {error && (
                <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--r-red)' }}>
                  <AlertCircle size={12} /> {error}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

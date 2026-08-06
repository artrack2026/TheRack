'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { CheckCircle, AlertCircle, Loader } from 'lucide-react'
import ParticleField from '@/components/ParticleField'
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase'

/** Landing point for the "confirm your new email" link Supabase sends when
 *  someone changes their email in /portal/profile. supabase-js picks the
 *  session/tokens up from the URL automatically on load; this page just
 *  waits for that and reports the result. The actual profiles.email sync
 *  happens in the database (see supabase/migrations/email_change_and_totp.sql),
 *  not here — this page is only ever a status display. */
export default function ConfirmEmailPage() {
  const [state, setState]     = useState<'loading' | 'success' | 'error'>('loading')
  const [email, setEmail]     = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) { setState('error'); setMessage('Supabase is not configured.'); return }

    const params     = new URLSearchParams(window.location.search)
    const hashParams  = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const errorDesc   = params.get('error_description') || hashParams.get('error_description')
    if (errorDesc) {
      setState('error')
      setMessage(errorDesc.replace(/\+/g, ' '))
      return
    }

    const supabase = getSupabaseClient()
    const timeout = setTimeout(() => {
      setState(s => s === 'loading' ? 'error' : s)
      setMessage(m => m ?? 'This link may have expired. Try changing your email again from your profile.')
    }, 8000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        clearTimeout(timeout)
        setEmail(session.user.email ?? null)
        setState('success')
      }
    })

    supabase.auth.getUser().then(({ data, error }) => {
      if (error) { clearTimeout(timeout); setState('error'); setMessage(error.message); return }
      if (data.user) { clearTimeout(timeout); setEmail(data.user.email ?? null); setState('success') }
    })

    return () => { clearTimeout(timeout); subscription.unsubscribe() }
  }, [])

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-20">
      <ParticleField />
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div
          className="p-8 text-center flex flex-col items-center gap-3"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '18px' }}
        >
          {state === 'loading' && (
            <>
              <Loader size={28} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Confirming your new email…</p>
            </>
          )}
          {state === 'success' && (
            <>
              <CheckCircle size={28} style={{ color: 'var(--r-green)' }} />
              <p className="font-bold" style={{ color: 'var(--color-text)' }}>Email updated</p>
              {email && (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Your login email is now <strong style={{ color: 'var(--color-text)' }}>{email}</strong>.
                </p>
              )}
              <Link href="/portal/profile" className="cyber-btn text-sm mt-2">Back to Profile</Link>
            </>
          )}
          {state === 'error' && (
            <>
              <AlertCircle size={28} style={{ color: 'var(--r-red)' }} />
              <p className="font-bold" style={{ color: 'var(--color-text)' }}>Couldn&apos;t confirm this link</p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{message}</p>
              <Link href="/portal/profile" className="cyber-btn art-btn-ghost text-sm mt-2">Back to Profile</Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

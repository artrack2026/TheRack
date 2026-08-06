'use client'

import { useState, useEffect, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, Loader, CheckCircle, Pencil, X, User, Phone, MapPin, Mail, ShieldCheck, AlertCircle, Send, Smartphone, Trash2 } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase'
import { formatPhone, formatName, formatState, formatCity, formatZip, formatEmail } from '@/lib/format'
import { Profile } from '@/lib/types'
import PageHeader from '@/components/PageHeader'

const EMPTY_FORM = {
  first_name:    '',
  last_name:     '',
  display_name:  '',
  phone:         '',
  address_line1: '',
  address_line2: '',
  city:          '',
  state:         '',
  zip:           '',
}

type Form = typeof EMPTY_FORM

function formFromProfile(profile: Profile | null | undefined): Form {
  return {
    first_name:    profile?.first_name    ?? '',
    last_name:     profile?.last_name     ?? '',
    display_name:  profile?.display_name  ?? '',
    phone:         profile?.phone         ?? '',
    address_line1: profile?.address_line1 ?? '',
    address_line2: profile?.address_line2 ?? '',
    city:          profile?.city          ?? '',
    state:         profile?.state         ?? '',
    zip:           profile?.zip           ?? '',
  }
}

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const [isEditing, setIsEditing]                   = useState(false)
  const [displayNameEdited, setDisplayNameEdited]   = useState(false)
  const [form, setForm]     = useState<Form>(EMPTY_FORM)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  /* Phone-change verification — only relevant while 2FA is enabled site-wide
     (checked here so a wrong/typo'd number can never lock someone out of
     SMS-based 2FA login). */
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [phoneChallenge, setPhoneChallenge] = useState<{ challengeId: string; maskedPhone: string } | null>(null)
  const [phoneCode, setPhoneCode]           = useState('')
  const [phoneRequesting, setPhoneRequesting] = useState(false)
  const [phoneVerifying, setPhoneVerifying]   = useState(false)
  const [phoneError, setPhoneError]           = useState<string | null>(null)

  /* Authenticator app (TOTP) — an alternative 2FA method that never depends
     on Textbelt or Supabase's email sending being up, so it's the most
     resilient option if either is down. */
  const [totpSetup, setTotpSetup]                     = useState<{ qrDataUrl: string; secret: string } | null>(null)
  const [totpStarting, setTotpStarting]               = useState(false)
  const [totpCode, setTotpCode]                       = useState('')
  const [totpVerifying, setTotpVerifying]             = useState(false)
  const [totpError, setTotpError]                     = useState<string | null>(null)
  const [totpDisabling, setTotpDisabling]             = useState(false)
  const [confirmDisableTotp, setConfirmDisableTotp]   = useState(false)

  /* Email change — Supabase Auth owns confirmation entirely (a link sent to
     the NEW address); nothing here is "changed" until that link is clicked
     and auth.users.email updates, which a DB trigger then mirrors into
     profiles.email (see supabase/migrations/email_change_and_totp.sql). */
  const [changingEmail, setChangingEmail] = useState(false)
  const [newEmail, setNewEmail]           = useState('')
  const [emailStatus, setEmailStatus]     = useState<'idle' | 'sending' | 'pending' | 'error'>('idle')
  const [emailError, setEmailError]       = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setForm(formFromProfile(profile))
      // If display_name was already saved, consider it edited
      if (profile.display_name) setDisplayNameEdited(true)
    }
  }, [profile])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    getSupabaseClient()
      .from('showroom_settings')
      .select('two_factor_enabled')
      .eq('id', 1)
      .single()
      .then(({ data }) => setTwoFactorEnabled(!!data?.two_factor_enabled))
  }, [])

  const startEditing = () => {
    setForm(formFromProfile(profile))
    setStatus('idle')
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setForm(formFromProfile(profile))
    setStatus('idle')
    setIsEditing(false)
    setPhoneChallenge(null)
    setPhoneCode('')
    setPhoneError(null)
    setChangingEmail(false)
    setNewEmail('')
    setEmailStatus('idle')
    setEmailError(null)
  }

  const startChangingEmail = () => {
    setNewEmail('')
    setEmailStatus('idle')
    setEmailError(null)
    setChangingEmail(true)
  }

  const cancelChangingEmail = () => {
    setChangingEmail(false)
    setNewEmail('')
    setEmailStatus('idle')
    setEmailError(null)
  }

  const handleChangeEmail = async () => {
    if (!isSupabaseConfigured) return
    const trimmed = newEmail.toLowerCase().trim()
    if (!trimmed) return
    if (trimmed === (user?.email ?? '').toLowerCase()) {
      setEmailError('That’s already your current email.')
      setEmailStatus('error')
      return
    }
    setEmailStatus('sending')
    setEmailError(null)
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.updateUser(
      { email: trimmed },
      { emailRedirectTo: `${window.location.origin}/auth/confirm-email` }
    )
    if (error) {
      setEmailError(error.message)
      setEmailStatus('error')
      return
    }
    setEmailStatus('pending')
  }

  const startTotpSetup = async () => {
    setTotpStarting(true)
    setTotpError(null)
    const res = await fetch('/api/auth/totp', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setTotpError(data.error ?? 'Failed to start setup')
      setTotpStarting(false)
      return
    }
    setTotpSetup({ qrDataUrl: data.qrDataUrl, secret: data.secret })
    setTotpCode('')
    setTotpStarting(false)
  }

  const cancelTotpSetup = () => {
    setTotpSetup(null)
    setTotpCode('')
    setTotpError(null)
  }

  const verifyTotpSetup = async () => {
    if (totpCode.length !== 6) return
    setTotpVerifying(true)
    setTotpError(null)
    const res = await fetch('/api/auth/totp', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: totpCode }),
    })
    const data = await res.json()
    if (!res.ok) {
      setTotpError(data.error ?? 'Verification failed')
      setTotpVerifying(false)
      return
    }
    setTotpSetup(null)
    setTotpCode('')
    setTotpVerifying(false)
    await refreshProfile()
  }

  const disableTotp = async () => {
    setTotpDisabling(true)
    await fetch('/api/auth/totp', { method: 'DELETE' })
    setTotpDisabling(false)
    setConfirmDisableTotp(false)
    await refreshProfile()
  }

  /* When first name changes, auto-fill display name unless user edited it manually */
  const handleFirstName = (value: string) => {
    const formatted = formatName(value)
    setForm(f => ({
      ...f,
      first_name:   formatted,
      display_name: displayNameEdited ? f.display_name : formatted,
    }))
  }

  const handleDisplayName = (value: string) => {
    setDisplayNameEdited(true)
    setForm(f => ({ ...f, display_name: formatName(value) }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !isSupabaseConfigured) return
    setStatus('saving')
    setPhoneError(null)

    const phoneChanged           = form.phone !== (profile?.phone ?? '')
    const needsPhoneVerification = phoneChanged && twoFactorEnabled
    const { phone, ...rest }     = form
    // A changed, unverified phone is held back from this write — it only
    // reaches the profile once /api/phone-verify/confirm accepts the code.
    const payload = needsPhoneVerification ? rest : form

    const supabase = getSupabaseClient()
    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)
    if (error) { setStatus('error'); return }

    if (needsPhoneVerification) {
      setPhoneRequesting(true)
      try {
        const res = await fetch('/api/phone-verify/request', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ newPhone: phone }),
        })
        const data = await res.json()
        if (!res.ok) {
          setPhoneError(data.error ?? 'Failed to send verification code.')
        } else if (data.required) {
          setPhoneChallenge({ challengeId: data.challengeId, maskedPhone: data.maskedPhone })
        }
      } catch {
        setPhoneError('Failed to send verification code.')
      } finally {
        setPhoneRequesting(false)
      }
      await refreshProfile()
      setStatus('idle')
      return
    }

    await refreshProfile()
    setIsEditing(false)
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2500)
  }

  const handleVerifyPhone = async () => {
    if (!phoneChallenge || phoneCode.length !== 6) return
    setPhoneVerifying(true)
    setPhoneError(null)
    try {
      const res = await fetch('/api/phone-verify/confirm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ challengeId: phoneChallenge.challengeId, code: phoneCode }),
      })
      const data = await res.json()
      if (!res.ok) { setPhoneError(data.error ?? 'Verification failed.'); return }

      setPhoneChallenge(null)
      setPhoneCode('')
      await refreshProfile()
      setIsEditing(false)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2500)
    } catch {
      setPhoneError('Verification failed. Please try again.')
    } finally {
      setPhoneVerifying(false)
    }
  }

  const cancelPhoneVerification = () => {
    setPhoneChallenge(null)
    setPhoneCode('')
    setPhoneError(null)
    setForm(f => ({ ...f, phone: profile?.phone ?? '' }))
  }

  const fullName = [form.first_name, form.last_name].filter(Boolean).join(' ')
  const cityStateZip = [form.city, [form.state, form.zip].filter(Boolean).join(' ')]
    .filter(Boolean).join(', ')

  return (
    <div className="input-tint-blue">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>

        <PageHeader
          eyebrow="Account"
          title="Profile"
          size="md"
          actions={
            <div className="flex items-center gap-3 shrink-0">
              <AnimatePresence>
                {status === 'saved' && (
                  <motion.span
                    initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-1 text-sm"
                    style={{ color: 'var(--r-green)' }}
                  >
                    <CheckCircle size={15} /> Saved
                  </motion.span>
                )}
              </AnimatePresence>
              {!isEditing && (
                <button onClick={startEditing} className="cyber-btn">
                  <Pencil size={14} /> Edit Profile
                </button>
              )}
            </div>
          }
        />

        {!isEditing ? (
          /* ── Read-only summary ── */
          <div className="flex flex-col gap-4">
            <SummaryCard icon={User} title="Personal Information" accent="var(--r-blue)">
              <SummaryRow label="Full Name"     value={fullName} />
              <SummaryRow label="Display Name"  value={form.display_name} />
              <SummaryRow label="Email"         value={user?.email} icon={Mail} />
              <SummaryRow label="Phone"         value={form.phone}  icon={Phone} />
            </SummaryCard>

            <SummaryCard icon={MapPin} title="Shipping Address" accent="var(--r-green)">
              <SummaryRow label="Address Line 1" value={form.address_line1} />
              <SummaryRow label="Address Line 2" value={form.address_line2} />
              <SummaryRow label="City / State / ZIP" value={cityStateZip} />
            </SummaryCard>
          </div>
        ) : (
          /* ── Edit form ── */
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Email — changing requires clicking a confirmation link sent to the new address */}
            <div className="p-4 rounded-xl flex flex-col gap-3" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs tracking-widest uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Email
                  </p>
                  <p style={{ color: 'var(--color-text)' }}>{user?.email}</p>
                </div>
                {!changingEmail && (
                  <button type="button" onClick={startChangingEmail} className="cyber-btn art-btn-ghost btn--sm">
                    <Pencil size={12} /> Change
                  </button>
                )}
              </div>

              {changingEmail && emailStatus !== 'pending' && (
                <div className="flex flex-col gap-2" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
                    New Email
                  </label>
                  <input
                    type="text"
                    className="cyber-input"
                    placeholder="new@email.com"
                    value={newEmail}
                    onChange={e => { setNewEmail(formatEmail(e.target.value)); setEmailStatus('idle'); setEmailError(null) }}
                  />
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    We&apos;ll email a confirmation link to the new address — your login email won&apos;t change until you click it.
                  </p>
                  {emailError && (
                    <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--r-red)' }}>
                      <AlertCircle size={12} /> {emailError}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={handleChangeEmail}
                      disabled={emailStatus === 'sending' || !newEmail.trim()}
                      className="cyber-btn btn--sm"
                    >
                      {emailStatus === 'sending'
                        ? <><Loader size={12} className="animate-spin" /> Sending…</>
                        : <><Send size={12} /> Send Confirmation Link</>}
                    </button>
                    <button type="button" onClick={cancelChangingEmail} className="cyber-btn art-btn-ghost btn--sm">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {emailStatus === 'pending' && (
                <div
                  className="flex items-start gap-2 text-xs p-3 rounded-lg"
                  style={{ background: 'rgba(212,176,48,0.08)', border: '1px solid rgba(212,176,48,0.25)', color: 'var(--color-text)' }}
                >
                  <Mail size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
                  <span>
                    Check <strong>{newEmail.trim()}</strong> for a confirmation link. Your login email stays{' '}
                    <strong>{user?.email}</strong> until it&apos;s clicked.{' '}
                    <button
                      type="button"
                      onClick={cancelChangingEmail}
                      className="underline"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
                    >
                      Use a different address
                    </button>
                  </span>
                </div>
              )}
            </div>

            {/* First / Last name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
                  First Name
                </label>
                <input
                  type="text"
                  className="cyber-input"
                  placeholder="Jane"
                  value={form.first_name}
                  onChange={e => handleFirstName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
                  Last Name
                </label>
                <input
                  type="text"
                  className="cyber-input"
                  placeholder="McGann"
                  value={form.last_name}
                  onChange={e => setForm(f => ({ ...f, last_name: formatName(e.target.value) }))}
                />
              </div>
            </div>

            {/* Display name + phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  className="cyber-input"
                  placeholder="How you want to appear"
                  value={form.display_name}
                  onChange={e => handleDisplayName(e.target.value)}
                />
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Defaults to your first name — change anytime
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
                  Phone
                </label>
                <input
                  type="tel"
                  className="cyber-input"
                  placeholder="(555) 555-0123"
                  value={form.phone}
                  disabled={!!phoneChallenge}
                  onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))}
                />
                {phoneRequesting && (
                  <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    <Loader size={12} className="animate-spin" /> Sending verification code…
                  </p>
                )}
                {!phoneChallenge && phoneError && (
                  <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--r-red)' }}>
                    <AlertCircle size={12} /> {phoneError}
                  </p>
                )}
                {phoneChallenge && (
                  <div
                    className="p-3 rounded-xl flex flex-col gap-2.5"
                    style={{ background: 'rgba(212,176,48,0.08)', border: '1px solid rgba(212,176,48,0.25)' }}
                  >
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text)' }}>
                      We texted a code to {phoneChallenge.maskedPhone} to confirm this number. Enter it to save.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        className="cyber-input"
                        placeholder="123456"
                        value={phoneCode}
                        onChange={e => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyPhone}
                        disabled={phoneVerifying || phoneCode.length !== 6}
                        className="cyber-btn btn--sm shrink-0"
                      >
                        {phoneVerifying ? <Loader size={13} className="animate-spin" /> : <ShieldCheck size={13} />} Verify
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={cancelPhoneVerification}
                      className="text-xs self-start"
                      style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Use a different number instead
                    </button>
                    {phoneError && (
                      <p className="text-xs" style={{ color: 'var(--r-red)' }}>{phoneError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Shipping address */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
              <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--color-text-muted)' }}>
                Shipping Address
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Address Line 1</label>
                  <input
                    type="text"
                    className="cyber-input"
                    placeholder="123 Main St"
                    value={form.address_line1}
                    onChange={e => setForm(f => ({ ...f, address_line1: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Address Line 2 (optional)</label>
                  <input
                    type="text"
                    className="cyber-input"
                    placeholder="Apt, Suite, Unit…"
                    value={form.address_line2}
                    onChange={e => setForm(f => ({ ...f, address_line2: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>City</label>
                    <input
                      type="text"
                      className="cyber-input"
                      placeholder="Austin"
                      value={form.city}
                      onChange={e => setForm(f => ({ ...f, city: formatCity(e.target.value) }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>State</label>
                    <input
                      type="text"
                      className="cyber-input"
                      placeholder="TX"
                      maxLength={2}
                      value={form.state}
                      onChange={e => setForm(f => ({ ...f, state: formatState(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>ZIP Code</label>
                  <input
                    type="text"
                    className="cyber-input"
                    placeholder="12345"
                    value={form.zip}
                    onChange={e => setForm(f => ({ ...f, zip: formatZip(e.target.value) }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <button type="submit" disabled={status === 'saving' || !!phoneChallenge} className="cyber-btn">
                {status === 'saving'
                  ? <><Loader size={14} className="animate-spin" /> Saving…</>
                  : <><Save size={14} /> Save Profile</>}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={status === 'saving'}
                className="cyber-btn art-btn-ghost"
              >
                <X size={14} /> Cancel
              </button>
              {status === 'error' && (
                <span className="text-sm" style={{ color: 'var(--r-red)' }}>Save failed — try again.</span>
              )}
            </div>
          </form>
        )}

        {/* Authenticator app 2FA — its own security setting, independent of
            whether the rest of the profile is being edited. */}
        <div
          className="rounded-2xl overflow-hidden mt-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--r-violet)' }}
        >
          <div className="flex items-center gap-2.5 px-6 pt-5 pb-4">
            <Smartphone size={15} style={{ color: 'var(--r-violet)' }} />
            <h3 className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--r-violet)' }}>
              Authenticator App
            </h3>
          </div>
          <div className="px-6 pb-6 flex flex-col gap-3">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              An alternative 2FA code from an app like Google Authenticator or Authy — it works even if text
              messages or email delivery are ever down, since it never depends on either being reachable.
            </p>

            {profile?.totp_enabled && !totpSetup && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--r-green)' }}>
                  <ShieldCheck size={14} /> Enabled
                </span>
                {confirmDisableTotp ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--r-red)' }}>Turn off authenticator app 2FA?</span>
                    <button
                      type="button"
                      onClick={disableTotp}
                      disabled={totpDisabling}
                      className="cyber-btn btn--sm"
                      style={{ color: 'var(--r-red)', borderColor: 'var(--r-red)' }}
                    >
                      {totpDisabling ? <Loader size={12} className="animate-spin" /> : <Trash2 size={12} />} Confirm
                    </button>
                    <button type="button" onClick={() => setConfirmDisableTotp(false)} className="cyber-btn art-btn-ghost btn--sm">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmDisableTotp(true)} className="cyber-btn art-btn-ghost btn--sm">
                    <X size={12} /> Disable
                  </button>
                )}
              </div>
            )}

            {!profile?.totp_enabled && !totpSetup && (
              <button type="button" onClick={startTotpSetup} disabled={totpStarting} className="cyber-btn btn--sm self-start">
                {totpStarting ? <><Loader size={12} className="animate-spin" /> Starting…</> : <><Smartphone size={12} /> Set Up Authenticator App</>}
              </button>
            )}

            {totpError && !totpSetup && (
              <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--r-red)' }}>
                <AlertCircle size={12} /> {totpError}
              </p>
            )}

            {totpSetup && (
              <div className="flex flex-col gap-3" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Scan this with your authenticator app, or enter the key manually, then type the 6-digit code it shows.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={totpSetup.qrDataUrl} alt="Authenticator app QR code" width={160} height={160} style={{ borderRadius: '10px' }} />
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
                      Manual entry key
                    </p>
                    <p className="text-sm font-mono break-all" style={{ color: 'var(--color-text)' }}>{totpSetup.secret}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 max-w-[200px]">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
                    6-digit code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="cyber-input text-center"
                    style={{ letterSpacing: '0.3em' }}
                    placeholder="123456"
                    value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>
                {totpError && (
                  <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--r-red)' }}>
                    <AlertCircle size={12} /> {totpError}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={verifyTotpSetup}
                    disabled={totpVerifying || totpCode.length !== 6}
                    className="cyber-btn btn--sm"
                  >
                    {totpVerifying ? <Loader size={12} className="animate-spin" /> : <ShieldCheck size={12} />} Verify & Enable
                  </button>
                  <button type="button" onClick={cancelTotpSetup} className="cyber-btn art-btn-ghost btn--sm">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Read-only summary components ── */

function SummaryCard({
  icon: Icon, title, accent, children,
}: { icon: React.ElementType; title: string; accent: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: `3px solid ${accent}` }}
    >
      <div className="flex items-center gap-2.5 px-6 pt-5 pb-4">
        <Icon size={15} style={{ color: accent }} />
        <h3 className="text-xs font-bold tracking-widest uppercase" style={{ color: accent }}>{title}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2">
        {children}
      </div>
    </div>
  )
}

function SummaryRow({
  label, value, icon: Icon,
}: { label: string; value?: string | null; icon?: React.ElementType }) {
  return (
    <div className="px-6 py-4" style={{ borderTop: '1px solid var(--color-border)' }}>
      <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </p>
      <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: value ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
        {Icon && <Icon size={13} style={{ color: 'var(--color-text-muted)' }} />}
        {value || 'Not set'}
      </p>
    </div>
  )
}

'use client'

import { useState, useEffect, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, Loader, CheckCircle, Pencil, X, User, Phone, MapPin, Mail } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase'
import { formatPhone, formatName, formatState, formatCity, formatZip } from '@/lib/format'
import { Profile } from '@/lib/types'

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

  useEffect(() => {
    if (profile) {
      setForm(formFromProfile(profile))
      // If display_name was already saved, consider it edited
      if (profile.display_name) setDisplayNameEdited(true)
    }
  }, [profile])

  const startEditing = () => {
    setForm(formFromProfile(profile))
    setStatus('idle')
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setForm(formFromProfile(profile))
    setStatus('idle')
    setIsEditing(false)
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
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('profiles')
      .update({ ...form })
      .eq('id', user.id)

    if (error) { setStatus('error'); return }
    await refreshProfile()
    setIsEditing(false)
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2500)
  }

  const fullName = [form.first_name, form.last_name].filter(Boolean).join(' ')
  const cityStateZip = [form.city, [form.state, form.zip].filter(Boolean).join(' ')]
    .filter(Boolean).join(', ')

  return (
    <div className="input-tint-blue">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase font-semibold mb-1" style={{ color: 'var(--r-blue)' }}>Account</p>
            <h2 className="text-3xl font-black mb-1" style={{ color: 'var(--color-text)' }}>Profile</h2>
            <div className="h-1 w-10" style={{ background: 'var(--r-blue)', borderRadius: 0 }} />
          </div>

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
              <button onClick={startEditing} className="cyber-btn btn--blue">
                <Pencil size={14} /> Edit Profile
              </button>
            )}
          </div>
        </div>

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

            {/* Email — read only */}
            <div className="p-4 rounded-xl" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs tracking-widest uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Email (read-only)
              </p>
              <p style={{ color: 'var(--color-text)' }}>{user?.email}</p>
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
                  placeholder="(555) 000-0000"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))}
                />
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
              <button type="submit" disabled={status === 'saving'} className="cyber-btn">
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

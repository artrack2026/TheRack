'use client'

import { useState, useEffect, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Save, Loader, CheckCircle } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase'

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const [form, setForm] = useState({
    display_name: '', phone: '',
    address_line1: '', address_line2: '',
    city: '', state: '', zip: '',
  })
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    if (profile) {
      setForm({
        display_name:  profile.display_name  ?? '',
        phone:         profile.phone         ?? '',
        address_line1: profile.address_line1 ?? '',
        address_line2: profile.address_line2 ?? '',
        city:          profile.city          ?? '',
        state:         profile.state         ?? '',
        zip:           profile.zip           ?? '',
      })
    }
  }, [profile])

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
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2500)
  }

  const field = (key: keyof typeof form, label: string, placeholder: string, type = 'text') => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </label>
      <input
        type={type}
        className="cyber-input"
        placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  )

  return (
    <div className="input-tint-blue">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <p className="text-xs tracking-[0.3em] uppercase font-semibold mb-1" style={{ color: 'var(--r-blue)' }}>Account</p>
        <h2 className="text-3xl font-black mb-1" style={{ color: 'var(--color-text)' }}>Profile</h2>
        <div className="h-1 w-10 mb-8" style={{ background: 'var(--r-blue)', borderRadius: 0 }} />

        <div className="mb-6 p-4 rounded-xl" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs tracking-widest uppercase font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Email (read-only)</p>
          <p style={{ color: 'var(--color-text)' }}>{user?.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('display_name', 'Display Name', 'Your name')}
            {field('phone', 'Phone', '(555) 000-0000', 'tel')}
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--color-text-muted)' }}>Shipping Address</p>
            <div className="flex flex-col gap-4">
              {field('address_line1', 'Address Line 1', '123 Main St')}
              {field('address_line2', 'Address Line 2 (optional)', 'Apt, Suite, Unit…')}
              <div className="grid grid-cols-2 gap-4">
                {field('city', 'City', 'City')}
                {field('state', 'State', 'TX')}
              </div>
              {field('zip', 'ZIP Code', '12345')}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <button type="submit" disabled={status === 'saving'} className="cyber-btn">
              {status === 'saving' ? <><Loader size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save Profile</>}
            </button>
            {status === 'saved' && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 text-sm" style={{ color: 'var(--r-green)' }}>
                <CheckCircle size={15} /> Saved!
              </motion.span>
            )}
            {status === 'error' && (
              <span className="text-sm" style={{ color: 'var(--r-red)' }}>Save failed — try again.</span>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  )
}

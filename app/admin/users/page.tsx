'use client'

import { useEffect, useState, FormEvent } from 'react'
import { formatName, formatEmail, formatPhone, formatCity, formatState, formatZip } from '@/lib/format'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, X, Loader, CheckCircle, Shield, User, AlertCircle, Eye, EyeOff, Pencil, Save, ShieldCheck, Handshake } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase'

interface UserRow {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip: string | null
  role: 'customer' | 'admin' | 'consignor'
  created_at: string
}

type EditForm = Omit<UserRow, 'id' | 'email' | 'created_at' | 'role'>

const ROLE_TABS: { key: UserRow['role']; label: string; icon: typeof User }[] = [
  { key: 'customer',  label: 'Customers',  icon: User },
  { key: 'admin',     label: 'Admins',     icon: Shield },
  { key: 'consignor', label: 'Consignors', icon: Handshake },
]

const EMPTY_EDIT: EditForm = {
  first_name: '', last_name: '', display_name: '',
  phone: '', address_line1: '', address_line2: '',
  city: '', state: '', zip: '',
}

export default function UsersPage() {
  const [users, setUsers]           = useState<UserRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState<UserRow['role']>('customer')
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser]     = useState<UserRow | null>(null)
  const [editForm, setEditForm]     = useState<EditForm>(EMPTY_EDIT)
  const [saving, setSaving]         = useState(false)
  const [saveOk, setSaveOk]         = useState(false)
  const [saveErr, setSaveErr]       = useState<string | null>(null)

  // Create form state
  const [createForm, setCreateForm] = useState({
    email: '', password: '', first_name: '', last_name: '', display_name: '', phone: '',
    role: 'customer' as 'customer' | 'admin' | 'consignor',
  })
  const [showPass, setShowPass]     = useState(false)
  const [creating, setCreating]     = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createOk, setCreateOk]       = useState(false)

  /* Phone-change verification — only relevant while 2FA is enabled site-wide
     (checked here so a wrong/typo'd number can never lock a customer out of
     SMS-based 2FA login). */
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [phoneChallenge, setPhoneChallenge] = useState<{ challengeId: string; maskedPhone: string } | null>(null)
  const [phoneCode, setPhoneCode]           = useState('')
  const [phoneRequesting, setPhoneRequesting] = useState(false)
  const [phoneVerifying, setPhoneVerifying]   = useState(false)
  const [phoneError, setPhoneError]           = useState<string | null>(null)

  const visibleUsers = users.filter(u => u.role === activeTab)
  const activeTabLabel = ROLE_TABS.find(t => t.key === activeTab)?.label ?? 'users'

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    load()
    if (!isSupabaseConfigured) return
    getSupabaseClient()
      .from('showroom_settings')
      .select('two_factor_enabled')
      .eq('id', 1)
      .single()
      .then(({ data }) => setTwoFactorEnabled(!!data?.two_factor_enabled))
  }, [])

  const openEdit = (u: UserRow) => {
    setEditUser(u)
    setEditForm({
      first_name:    u.first_name    ?? '',
      last_name:     u.last_name     ?? '',
      display_name:  u.display_name  ?? '',
      phone:         u.phone         ?? '',
      address_line1: u.address_line1 ?? '',
      address_line2: u.address_line2 ?? '',
      city:          u.city          ?? '',
      state:         u.state         ?? '',
      zip:           u.zip           ?? '',
    })
    setSaveOk(false)
    setSaveErr(null)
    setPhoneChallenge(null)
    setPhoneCode('')
    setPhoneError(null)
  }

  const closeEdit = () => {
    setEditUser(null)
    setEditForm(EMPTY_EDIT)
    setPhoneChallenge(null)
    setPhoneCode('')
    setPhoneError(null)
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    setSaving(true)
    setSaveErr(null)
    setPhoneError(null)

    const phoneChanged           = editForm.phone !== (editUser.phone ?? '')
    const needsPhoneVerification = phoneChanged && twoFactorEnabled
    const { phone, ...rest }     = editForm
    // A changed, unverified phone is held back from this write — it only
    // reaches the profile once /api/phone-verify/confirm accepts the code.
    const payload = needsPhoneVerification ? rest : editForm

    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editUser.id, ...payload }),
    })
    if (!res.ok) {
      const d = await res.json()
      setSaveErr(d.error ?? 'Save failed')
      setSaving(false)
      return
    }

    setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...payload } : u))

    if (needsPhoneVerification) {
      setPhoneRequesting(true)
      try {
        const vRes = await fetch('/api/phone-verify/request', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ userId: editUser.id, newPhone: phone }),
        })
        const vData = await vRes.json()
        if (!vRes.ok) {
          setPhoneError(vData.error ?? 'Failed to send verification code.')
        } else if (vData.required) {
          setPhoneChallenge({ challengeId: vData.challengeId, maskedPhone: vData.maskedPhone })
        }
      } catch {
        setPhoneError('Failed to send verification code.')
      } finally {
        setPhoneRequesting(false)
      }
      setSaving(false)
      return
    }

    setSaveOk(true)
    setTimeout(() => setSaveOk(false), 2500)
    setSaving(false)
  }

  const handleVerifyPhone = async () => {
    if (!phoneChallenge || !editUser || phoneCode.length !== 6) return
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

      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, phone: data.phone } : u))
      setPhoneChallenge(null)
      setPhoneCode('')
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 2500)
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
    if (editUser) setEditForm(f => ({ ...f, phone: editUser.phone ?? '' }))
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:        createForm.email.toLowerCase().trim(),
        password:     createForm.password,
        first_name:   createForm.first_name,
        last_name:    createForm.last_name,
        display_name: createForm.display_name,
        phone:        createForm.phone,
        role:         createForm.role,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setCreateError(data.error ?? 'Failed to create user')
    } else {
      setCreateOk(true)
      setCreateForm({ email: '', password: '', first_name: '', last_name: '', display_name: '', phone: '', role: 'customer' })
      setTimeout(() => { setCreateOk(false); setShowCreate(false); load() }, 1800)
    }
    setCreating(false)
  }

  /* Shared field renderer for the edit form */
  const ef = (
    key: keyof EditForm,
    label: string,
    placeholder: string,
    formatter?: (v: string) => string,
    type = 'text',
    maxLength?: number,
    disabled?: boolean,
  ) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </label>
      <input
        type={type}
        className="cyber-input"
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        value={(editForm[key] ?? '') as string}
        onChange={e => setEditForm(f => ({ ...f, [key]: formatter ? formatter(e.target.value) : e.target.value }))}
      />
    </div>
  )

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Users"
        size="md"
        accentColor="var(--r-violet)"
        actions={
          <button
            onClick={() => {
              setShowCreate(v => !v)
              if (!showCreate) setCreateForm(f => ({ ...f, role: activeTab }))
            }}
            className="cyber-btn btn--violet text-sm"
          >
            <Plus size={14} /> New Account
          </button>
        }
      />

      {/* Role tabs */}
      <div className="flex gap-2 mb-6">
        {ROLE_TABS.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key
          const count  = users.filter(u => u.role === key).length
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors"
              style={{
                background: active ? 'var(--color-surface)' : 'transparent',
                color:      active ? 'var(--color-text)' : 'var(--color-text-muted)',
                border:     `1px solid ${active ? 'var(--r-violet)' : 'var(--color-border)'}`,
                borderRadius: '10px',
              }}
            >
              <Icon size={14} style={{ color: active ? 'var(--r-violet)' : 'var(--color-text-muted)' }} />
              {label}
              <span
                className="text-xs font-mono px-1.5 rounded-full"
                style={{
                  background: active ? 'var(--color-surface-2)' : 'transparent',
                  color: 'var(--color-text-muted)',
                }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
            <div className="p-6 input-tint-blue" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px' }}>
              <div className="flex items-center justify-between mb-5">
                <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Create Customer Account</p>
                <button onClick={() => setShowCreate(false)} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
              </div>
              <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Email *</label>
                  <input required type="text" className="cyber-input" placeholder="customer@email.com"
                    value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: formatEmail(e.target.value) }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Temp Password *</label>
                  <div className="relative">
                    <input required type={showPass ? 'text' : 'password'} className="cyber-input pr-10" placeholder="••••••••"
                      value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>First Name</label>
                  <input type="text" className="cyber-input" placeholder="Jane"
                    value={createForm.first_name} onChange={e => setCreateForm(f => ({ ...f, first_name: formatName(e.target.value) }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Last Name</label>
                  <input type="text" className="cyber-input" placeholder="McGann"
                    value={createForm.last_name} onChange={e => setCreateForm(f => ({ ...f, last_name: formatName(e.target.value) }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Display Name</label>
                  <input type="text" className="cyber-input" placeholder="How they appear"
                    value={createForm.display_name} onChange={e => setCreateForm(f => ({ ...f, display_name: formatName(e.target.value) }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Phone *</label>
                  <input required type="tel" className="cyber-input" placeholder="(555) 555-0123"
                    value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: formatPhone(e.target.value) }))} />
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Required for SMS login verification</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Role</label>
                  <select className="cyber-input appearance-none cursor-pointer" value={createForm.role}
                    onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as 'customer' | 'admin' | 'consignor' }))}
                    style={{ background: 'var(--color-surface)' }}>
                    <option value="customer">Customer</option>
                    <option value="consignor">Consignor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {createError && (
                  <div className="sm:col-span-2 flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg"
                    style={{ background: 'rgba(224,88,88,0.1)', color: 'var(--r-red)', border: '1px solid rgba(224,88,88,0.25)' }}>
                    <AlertCircle size={14} /> {createError}
                  </div>
                )}
                <div className="sm:col-span-2 flex items-center gap-3">
                  <button type="submit" disabled={creating} className="cyber-btn text-sm">
                    {creating ? <><Loader size={13} className="animate-spin" /> Creating…</> : <><Plus size={13} /> Create Account</>}
                  </button>
                  {createOk && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 text-sm" style={{ color: 'var(--r-green)' }}>
                      <CheckCircle size={14} /> Account created!
                    </motion.span>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : visibleUsers.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--color-text-muted)' }}>
          <Users size={48} className="mx-auto mb-3 opacity-30" />
          <p>No {activeTabLabel.toLowerCase()} yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleUsers.map((u, i) => (
            <motion.div key={u.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04 }}>
              {/* Card — clickable to edit */}
              <button
                onClick={() => openEdit(u)}
                className="w-full text-left p-4 flex items-center gap-4 group transition-all duration-200"
                style={{
                  background: editUser?.id === u.id ? 'var(--color-surface-2)' : 'var(--color-surface)',
                  border: `1px solid ${editUser?.id === u.id ? 'var(--r-blue)' : 'var(--color-border)'}`,
                  borderLeft: `3px solid var(--r-blue)`,
                  borderRadius: '0 12px 12px 0',
                  cursor: 'pointer',
                }}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold shrink-0"
                  style={{ background: 'rgba(56,120,224,0.15)', color: 'var(--r-blue)' }}>
                  {((u.first_name?.[0] ?? u.display_name?.[0] ?? u.email[0]) || 'U').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                      {u.first_name && u.last_name
                        ? `${u.first_name} ${u.last_name}`
                        : u.display_name ?? '—'}
                    </p>
                    {u.role === 'consignor' && (
                      <span className="category-badge text-xs shrink-0" style={{ color: 'var(--r-violet)', borderColor: 'var(--r-violet)' }}>
                        Consignor
                      </span>
                    )}
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{u.email}</p>
                  {u.phone && (
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{u.phone}</p>
                  )}
                </div>
                <p className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                  {new Date(u.created_at).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-1.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                  <Pencil size={13} style={{ color: 'var(--r-blue)' }} />
                </div>
              </button>

              {/* Inline edit panel — expands below the card when selected */}
              <AnimatePresence>
                {editUser?.id === u.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 input-tint-blue"
                      style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--r-blue)',
                        borderTop: 'none',
                        borderRadius: '0 0 12px 12px',
                      }}>

                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                            Edit Profile — {u.email}
                          </p>
                        </div>
                        <button onClick={closeEdit} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <X size={16} />
                        </button>
                      </div>

                      <form onSubmit={handleSave} className="flex flex-col gap-4">
                        {/* Name row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {ef('first_name',   'First Name',    'Jane',   formatName)}
                          {ef('last_name',    'Last Name',     'McGann', formatName)}
                        </div>

                        {/* Display name + phone */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {ef('display_name', 'Display Name',  'How they appear', formatName)}
                          {ef('phone',        'Phone',         '(555) 555-0123',  formatPhone, 'tel', undefined, !!phoneChallenge)}
                        </div>

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
                              We texted a code to {phoneChallenge.maskedPhone} to confirm this number before it&apos;s saved.
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
                                className="cyber-btn btn--violet btn--sm shrink-0"
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

                        {/* Address */}
                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--color-text-muted)' }}>
                            Shipping Address
                          </p>
                          <div className="flex flex-col gap-3">
                            {ef('address_line1', 'Address Line 1', '123 Main St')}
                            {ef('address_line2', 'Address Line 2 (optional)', 'Apt, Suite…')}
                            <div className="grid grid-cols-2 gap-3">
                              {ef('city',  'City',     'Austin', formatCity)}
                              {ef('state', 'State',    'TX',     formatState, 'text', 2)}
                            </div>
                            {ef('zip', 'ZIP', '12345', formatZip)}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-1">
                          <button type="submit" disabled={saving || !!phoneChallenge} className="cyber-btn text-sm">
                            {saving
                              ? <><Loader size={13} className="animate-spin" /> Saving…</>
                              : <><Save size={13} /> Save Changes</>}
                          </button>
                          <button type="button" onClick={closeEdit} className="cyber-btn art-btn-ghost text-sm">
                            Cancel
                          </button>
                          {saveOk && (
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                              className="flex items-center gap-1 text-sm" style={{ color: 'var(--r-green)' }}>
                              <CheckCircle size={14} /> Saved!
                            </motion.span>
                          )}
                          {saveErr && (
                            <span className="text-sm flex items-center gap-1" style={{ color: 'var(--r-red)' }}>
                              <AlertCircle size={13} /> {saveErr}
                            </span>
                          )}
                        </div>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState, FormEvent } from 'react'
import { formatName, formatEmail, formatPhone, formatCity, formatState, formatZip } from '@/lib/format'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, X, Loader, CheckCircle, Shield, User, AlertCircle, Eye, EyeOff, Pencil, Save } from 'lucide-react'
import PageHeader from '@/components/PageHeader'

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
  role: 'customer' | 'admin'
  created_at: string
}

type EditForm = Omit<UserRow, 'id' | 'email' | 'created_at' | 'role'>

const EMPTY_EDIT: EditForm = {
  first_name: '', last_name: '', display_name: '',
  phone: '', address_line1: '', address_line2: '',
  city: '', state: '', zip: '',
}

export default function UsersPage() {
  const [users, setUsers]           = useState<UserRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser]     = useState<UserRow | null>(null)
  const [editForm, setEditForm]     = useState<EditForm>(EMPTY_EDIT)
  const [saving, setSaving]         = useState(false)
  const [saveOk, setSaveOk]         = useState(false)
  const [saveErr, setSaveErr]       = useState<string | null>(null)

  // Create form state
  const [createForm, setCreateForm] = useState({ email: '', password: '', display_name: '', phone: '', role: 'customer' as 'customer' | 'admin' })
  const [showPass, setShowPass]     = useState(false)
  const [creating, setCreating]     = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createOk, setCreateOk]       = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

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
  }

  const closeEdit = () => { setEditUser(null); setEditForm(EMPTY_EDIT) }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    setSaving(true)
    setSaveErr(null)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editUser.id, ...editForm }),
    })
    if (!res.ok) {
      const d = await res.json()
      setSaveErr(d.error ?? 'Save failed')
    } else {
      setSaveOk(true)
      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...editForm } : u))
      setTimeout(() => setSaveOk(false), 2500)
    }
    setSaving(false)
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
      setCreateForm({ email: '', password: '', display_name: '', phone: '', role: 'customer' })
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
          <button onClick={() => setShowCreate(v => !v)} className="cyber-btn btn--violet text-sm">
            <Plus size={14} /> New Account
          </button>
        }
      />

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
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Display Name</label>
                  <input type="text" className="cyber-input" placeholder="Customer Name"
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
                    onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as 'customer' | 'admin' }))}
                    style={{ background: 'var(--color-surface)' }}>
                    <option value="customer">Customer</option>
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
      ) : users.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--color-text-muted)' }}>
          <Users size={48} className="mx-auto mb-3 opacity-30" />
          <p>No users yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {users.map((u, i) => (
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
                  <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                    {u.first_name && u.last_name
                      ? `${u.first_name} ${u.last_name}`
                      : u.display_name ?? '—'}
                  </p>
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
                          {ef('phone',        'Phone',         '(555) 555-0123',  formatPhone, 'tel')}
                        </div>

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
                          <button type="submit" disabled={saving} className="cyber-btn text-sm">
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

      {/* Shield icon kept for potential admin badge use */}
      <span className="hidden"><Shield size={0} /><User size={0} /></span>
    </div>
  )
}

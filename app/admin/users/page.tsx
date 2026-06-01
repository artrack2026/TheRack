'use client'

import { useEffect, useState, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, X, Loader, CheckCircle, Shield, User, AlertCircle, Eye, EyeOff } from 'lucide-react'

interface UserRow {
  id: string
  email: string
  display_name: string | null
  role: 'customer' | 'admin'
  created_at: string
}

export default function UsersPage() {
  const [users, setUsers]       = useState<UserRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ email: '', password: '', display_name: '', role: 'customer' as 'customer' | 'admin' })
  const [showPass, setShowPass] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createOk, setCreateOk]       = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        /* Email normalized to lowercase on creation */
        email:        form.email.toLowerCase().trim(),
        password:     form.password,
        display_name: form.display_name,
        role:         form.role,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setCreateError(data.error ?? 'Failed to create user')
    } else {
      setCreateOk(true)
      setForm({ email: '', password: '', display_name: '', role: 'customer' })
      setTimeout(() => { setCreateOk(false); setShowForm(false); load() }, 1800)
    }
    setCreating(false)
  }

  const promoteToAdmin = async (id: string) => {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role: 'admin' }),
    })
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role: 'admin' } : u))
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase font-semibold mb-1" style={{ color: 'var(--r-blue)' }}>Admin</p>
          <h2 className="text-3xl font-black mb-1" style={{ color: 'var(--color-text)' }}>Users</h2>
          <div className="h-1 w-10" style={{ background: 'var(--r-blue)', borderRadius: 0 }} />
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="cyber-btn text-sm"
          style={{ color: 'var(--r-blue)', borderColor: 'var(--r-blue)' }}
        >
          <Plus size={14} /> New Account
        </button>
      </motion.div>

      {/* Create account form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="p-6 input-tint-blue" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px' }}>
              <div className="flex items-center justify-between mb-5">
                <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Create Customer Account</p>
                <button onClick={() => setShowForm(false)} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Email *</label>
                  <input required type="text" className="cyber-input" placeholder="customer@email.com"
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Saved lowercase automatically</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Temp Password *</label>
                  <div className="relative">
                    <input required type={showPass ? 'text' : 'password'} className="cyber-input pr-10" placeholder="••••••••"
                      value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Display Name</label>
                  <input type="text" className="cyber-input" placeholder="Customer Name"
                    value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Role</label>
                  <select className="cyber-input appearance-none cursor-pointer" value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value as 'customer' | 'admin' }))}
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

      {/* Users list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--color-text-muted)' }}>
          <Users size={48} className="mx-auto mb-3 opacity-30" />
          <p>No users yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {users.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04 }}
              className="p-4 flex items-center gap-4"
              style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderLeft: `3px solid ${u.role === 'admin' ? 'var(--r-violet)' : 'var(--r-blue)'}`,
                borderRadius: '0 12px 12px 0',
              }}
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold shrink-0"
                style={{ background: u.role === 'admin' ? 'rgba(136,68,216,0.15)' : 'rgba(56,120,224,0.15)', color: u.role === 'admin' ? 'var(--r-violet)' : 'var(--r-blue)' }}>
                {(u.display_name?.[0] ?? u.email[0]).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  {u.display_name ?? '—'}{' '}
                  {u.role === 'admin' && (
                    <span className="inline-flex items-center gap-0.5 text-xs font-bold ml-1 px-1.5 py-0.5 rounded" style={{ background: 'rgba(136,68,216,0.15)', color: 'var(--r-violet)' }}>
                      <Shield size={9} /> Admin
                    </span>
                  )}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{u.email}</p>
              </div>
              <p className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                {new Date(u.created_at).toLocaleDateString()}
              </p>
              {u.role === 'customer' && (
                <button onClick={() => promoteToAdmin(u.id)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium shrink-0"
                  style={{ color: 'var(--r-violet)', border: '1px solid rgba(136,68,216,0.3)', background: 'none', cursor: 'pointer' }}>
                  <User size={11} /> Promote
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

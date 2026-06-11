'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingCart, Search, X, ChevronUp, ChevronDown, ChevronsUpDown,
  Clock, CheckCircle, Truck, Package, XCircle, DollarSign,
  User, Mail, Phone, MapPin, Calendar, Gift, TrendingUp,
  ChevronRight, ExternalLink, Loader, AlertCircle, Edit3, Save, RefreshCcw,
} from 'lucide-react'
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { Order, OrderItem, Profile } from '@/lib/types'

/* ── Constants ── */

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:   { label: 'Pending',   color: '#d4b030', icon: Clock       },
  paid:      { label: 'Paid',      color: '#3ab870', icon: CheckCircle },
  shipped:   { label: 'Shipped',   color: '#3878e0', icon: Truck       },
  delivered: { label: 'Delivered', color: '#8844d8', icon: Package     },
  cancelled: { label: 'Cancelled', color: '#e05858', icon: XCircle     },
}
const ALL_STATUSES = Object.keys(STATUS_META)

type SortKey = 'created_at' | 'customer_name' | 'customer_email' | 'status' | 'total' | 'payment_method'
type SortDir = 'asc' | 'desc'

interface CustomerProfile {
  profile:     Profile | null
  orders:      Order[]
  totalSpent:  number
  editBirthday:string
  savingBd:    boolean
  bdSaved:     boolean
}

/* ── Helpers ── */

function shortId(id: string) { return id.split('-')[0].toUpperCase() }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtMoney(n: number) { return `$${n.toFixed(2)}` }

function SortIcon({ col, sort }: { col: SortKey; sort: { key: SortKey; dir: SortDir } }) {
  if (sort.key !== col) return <ChevronsUpDown size={12} style={{ color: 'var(--color-border)' }} />
  return sort.dir === 'asc'
    ? <ChevronUp size={12} style={{ color: 'var(--color-primary)' }} />
    : <ChevronDown size={12} style={{ color: 'var(--color-primary)' }} />
}

/* ── Main Component ── */

export default function AdminOrdersPage() {
  const [orders, setOrders]       = useState<(Order & { items?: OrderItem[] })[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  // Filters
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState<string>('all')
  const [sort, setSort]           = useState<{ key: SortKey; dir: SortDir }>({ key: 'created_at', dir: 'desc' })

  // Status update UI
  const [statusMenu, setStatusMenu] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  // Customer profile drawer
  const [drawerEmail, setDrawerEmail]     = useState<string | null>(null)
  const [drawer, setDrawer]               = useState<CustomerProfile | null>(null)
  const [loadingDrawer, setLoadingDrawer] = useState(false)

  /* ── Load orders ── */

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    setLoading(true); setError(null)
    try {
      const sb = getSupabaseClient()
      const { data, error: err } = await sb
        .from('orders')
        .select('*, items:order_items(*)')
        .order('created_at', { ascending: false })

      if (err) throw err
      setOrders((data as (Order & { items?: OrderItem[] })[]) ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  /* ── Computed stats ── */

  const stats = useMemo(() => {
    const total    = orders.length
    const pending  = orders.filter(o => o.status === 'pending').length
    const revenue  = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0)
    const thisMonth = orders.filter(o => {
      const d = new Date(o.created_at)
      const n = new Date()
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
    }).reduce((s, o) => s + (o.status !== 'cancelled' ? o.total : 0), 0)
    return { total, pending, revenue, thisMonth }
  }, [orders])

  /* ── Filtered + sorted view ── */

  const visible = useMemo(() => {
    let rows = [...orders]
    if (statusFilter !== 'all') rows = rows.filter(o => o.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(o =>
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_email.toLowerCase().includes(q) ||
        shortId(o.id).toLowerCase().includes(q),
      )
    }
    rows.sort((a, b) => {
      let av: string | number = a[sort.key] ?? ''
      let bv: string | number = b[sort.key] ?? ''
      if (sort.key === 'total') { av = a.total; bv = b.total }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [orders, statusFilter, search, sort])

  /* ── Status update ── */

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(orderId)
    setStatusMenu(null)
    try {
      const sb = getSupabaseClient()
      await sb.from('orders').update({ status: newStatus as Order['status'] }).eq('id', orderId)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as Order['status'] } : o))
      if (drawer && drawer.orders.some(o => o.id === orderId)) {
        setDrawer(d => d ? { ...d, orders: d.orders.map(o => o.id === orderId ? { ...o, status: newStatus as Order['status'] } : o) } : d)
      }
    } catch { /* silent */ }
    finally { setUpdatingStatus(null) }
  }

  /* ── Sort toggle ── */

  const toggleSort = (key: SortKey) =>
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })

  /* ── Customer profile drawer ── */

  const openDrawer = useCallback(async (email: string) => {
    setDrawerEmail(email)
    setLoadingDrawer(true)
    setDrawer(null)
    try {
      const sb = getSupabaseClient()
      const [{ data: profileData }, { data: orderData }] = await Promise.all([
        sb.from('profiles').select('*').eq('email', email.toLowerCase()).maybeSingle(),
        sb.from('orders').select('*, items:order_items(*)').eq('customer_email', email.toLowerCase()).order('created_at', { ascending: false }),
      ])
      const customerOrders = (orderData as Order[]) ?? []
      const totalSpent = customerOrders
        .filter(o => o.status !== 'cancelled')
        .reduce((s, o) => s + o.total, 0)

      setDrawer({
        profile:     (profileData as Profile) ?? null,
        orders:      customerOrders,
        totalSpent,
        editBirthday: profileData?.birthday ?? '',
        savingBd:    false,
        bdSaved:     false,
      })
    } catch { /* silent */ }
    finally { setLoadingDrawer(false) }
  }, [])

  const saveBirthday = async () => {
    if (!drawer?.profile) return
    setDrawer(d => d ? { ...d, savingBd: true } : d)
    try {
      const sb = getSupabaseClient()
      await sb.from('profiles').update({ birthday: drawer.editBirthday || null }).eq('id', drawer.profile.id)
      setDrawer(d => d ? { ...d, savingBd: false, bdSaved: true, profile: d.profile ? { ...d.profile, birthday: d.editBirthday || null } : null } : d)
      setTimeout(() => setDrawer(d => d ? { ...d, bdSaved: false } : d), 2500)
    } catch {
      setDrawer(d => d ? { ...d, savingBd: false } : d)
    }
  }

  /* ── Render ── */

  return (
    <div onClick={() => setStatusMenu(null)}>
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mb-8">
        <p className="text-xs tracking-[0.3em] uppercase font-semibold mb-1" style={{ color: 'var(--r-green)' }}>Admin</p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-black" style={{ color: 'var(--color-text)' }}>Orders</h1>
            <div className="h-1 w-12 mt-2" style={{ background: 'var(--r-green)', borderRadius: 0 }} />
          </div>
          <button onClick={load} className="cyber-btn btn--green btn--sm flex items-center gap-1.5">
            <RefreshCcw size={13} /> Refresh
          </button>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        {[
          { label: 'Total Orders', value: stats.total, color: '#3ab870', icon: ShoppingCart },
          { label: 'Pending',      value: stats.pending, color: '#d4b030', icon: Clock },
          { label: 'All-Time Revenue', value: fmtMoney(stats.revenue), color: '#8844d8', icon: TrendingUp },
          { label: 'This Month',   value: fmtMoney(stats.thisMonth), color: '#3878e0', icon: DollarSign },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="p-4 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: `3px solid ${color}` }}>
            <div className="p-2 rounded-lg w-fit mb-2" style={{ background: `${color}18` }}>
              <Icon size={16} style={{ color }} />
            </div>
            <p className="text-xl font-black" style={{ color: 'var(--color-text)' }}>{loading ? '—' : value}</p>
            <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
          </div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-3 mb-5 items-center"
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search customer, email, order #…"
            className="cyber-input pl-9 text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {['all', ...ALL_STATUSES].map(s => {
            const meta = s !== 'all' ? STATUS_META[s] : null
            const active = statusFilter === s
            return (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-150"
                style={{
                  background: active ? (meta?.color ?? 'var(--color-primary)') + '20' : 'var(--color-surface)',
                  border: `1.5px solid ${active ? (meta?.color ?? 'var(--color-primary)') : 'var(--color-border)'}`,
                  color:  active ? (meta?.color ?? 'var(--color-primary)') : 'var(--color-text-muted)',
                }}
              >
                {s === 'all' ? 'All' : STATUS_META[s].label}
                {s !== 'all' && (
                  <span className="ml-1.5 opacity-70">
                    {orders.filter(o => o.status === s).length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl mb-4 text-sm" style={{ background: 'rgba(224,88,88,0.08)', border: '1px solid rgba(224,88,88,0.2)', color: 'var(--r-red)' }}>
          <AlertCircle size={16} />{error}
        </div>
      )}

      {/* Table */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20" style={{ color: 'var(--color-text-muted)' }}>
            <Loader size={20} className="animate-spin" /> Loading orders…
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
            <p style={{ color: 'var(--color-text-muted)' }}>
              {search || statusFilter !== 'all' ? 'No orders match your filters.' : 'No orders yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                  {(
                    [
                      { key: null,          label: '#',              w: '80px'  },
                      { key: 'created_at',  label: 'Date',           w: '110px' },
                      { key: 'customer_name', label: 'Customer',     w: '160px' },
                      { key: 'customer_email', label: 'Email',       w: '180px' },
                      { key: null,          label: 'Items',          w: '60px'  },
                      { key: 'payment_method', label: 'Payment',     w: '100px' },
                      { key: 'total',       label: 'Total',          w: '90px'  },
                      { key: 'status',      label: 'Status',         w: '120px' },
                      { key: null,          label: '',               w: '40px'  },
                    ] as { key: SortKey | null; label: string; w: string }[]
                  ).map(({ key, label, w }) => (
                    <th
                      key={label}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest"
                      style={{ color: 'var(--color-text-muted)', width: w, whiteSpace: 'nowrap',
                               cursor: key ? 'pointer' : 'default' }}
                      onClick={key ? () => toggleSort(key) : undefined}
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        {key && <SortIcon col={key} sort={sort} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((order, idx) => {
                  const st = STATUS_META[order.status] ?? STATUS_META.pending
                  const StIcon = st.icon
                  const isUpdating = updatingStatus === order.id
                  const menuOpen = statusMenu === order.id

                  return (
                    <tr
                      key={order.id}
                      className="transition-colors duration-100"
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                      }}
                    >
                      {/* Order # */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>
                          {shortId(order.id)}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {fmtDate(order.created_at)}
                      </td>

                      {/* Customer name — clickable */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDrawer(order.customer_email)}
                          className="font-semibold text-left hover:underline flex items-center gap-1"
                          style={{ color: 'var(--color-text)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          {order.customer_name}
                          <ChevronRight size={12} style={{ color: 'var(--color-primary)' }} />
                        </button>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3">
                        <a
                          href={`mailto:${order.customer_email}`}
                          className="text-xs hover:underline"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          {order.customer_email}
                        </a>
                      </td>

                      {/* Items count */}
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>
                          {order.items?.length ?? '—'}
                        </span>
                      </td>

                      {/* Payment method */}
                      <td className="px-4 py-3">
                        <span className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>
                          {order.payment_method ?? '—'}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3">
                        <span className="font-black text-sm" style={{ color: 'var(--color-text)' }}>
                          {fmtMoney(order.total)}
                        </span>
                      </td>

                      {/* Status — clickable dropdown */}
                      <td className="px-4 py-3">
                        <div className="relative" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setStatusMenu(menuOpen ? null : order.id)}
                            disabled={isUpdating}
                            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-all duration-150"
                            style={{
                              background: `${st.color}18`,
                              border: `1px solid ${st.color}40`,
                              color: st.color,
                              cursor: 'pointer',
                            }}
                          >
                            {isUpdating
                              ? <Loader size={11} className="animate-spin" />
                              : <StIcon size={11} />
                            }
                            {st.label}
                          </button>

                          <AnimatePresence>
                            {menuOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -6, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.95 }}
                                transition={{ duration: 0.12 }}
                                className="absolute left-0 top-full mt-1 z-20 rounded-xl overflow-hidden py-1"
                                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', minWidth: '140px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
                              >
                                {ALL_STATUSES.map(s => {
                                  const sm = STATUS_META[s]
                                  const SmIcon = sm.icon
                                  return (
                                    <button
                                      key={s}
                                      onClick={() => updateStatus(order.id, s)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-left transition-colors hover:bg-white/5"
                                      style={{ color: s === order.status ? sm.color : 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                      <SmIcon size={12} style={{ color: sm.color }} />
                                      {sm.label}
                                      {s === order.status && ' ✓'}
                                    </button>
                                  )
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>

                      {/* Row action */}
                      <td className="px-2 py-3">
                        <button
                          onClick={() => openDrawer(order.customer_email)}
                          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                          style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                          title="View customer profile"
                        >
                          <User size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count */}
        {!loading && visible.length > 0 && (
          <div className="px-4 py-3 text-xs flex justify-between items-center" style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'var(--color-bg)' }}>
            <span>Showing {visible.length} of {orders.length} order{orders.length !== 1 ? 's' : ''}</span>
            <span>{fmtMoney(visible.reduce((s, o) => s + (o.status !== 'cancelled' ? o.total : 0), 0))} filtered revenue</span>
          </div>
        )}
      </motion.div>

      {/* ── Customer Profile Drawer ── */}
      <AnimatePresence>
        {drawerEmail && (
          <>
            {/* Backdrop */}
            <motion.div
              key="drawer-bg"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.6)' }}
              onClick={() => setDrawerEmail(null)}
            />

            {/* Drawer panel */}
            <motion.aside
              key="drawer-panel"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-y-auto"
              style={{ width: 'min(520px, 100vw)', background: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-6 py-5 sticky top-0 z-10" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <User size={16} style={{ color: 'var(--r-blue)' }} />
                  <span className="font-bold" style={{ color: 'var(--color-text)' }}>Customer Profile</span>
                </div>
                <button
                  onClick={() => setDrawerEmail(null)}
                  className="p-2 rounded-full hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer body */}
              <div className="flex-1 px-6 py-5 flex flex-col gap-5">
                {loadingDrawer ? (
                  <div className="flex items-center justify-center gap-2 py-20" style={{ color: 'var(--color-text-muted)' }}>
                    <Loader size={20} className="animate-spin" /> Loading profile…
                  </div>
                ) : !drawer ? (
                  <p style={{ color: 'var(--color-text-muted)' }}>No data found.</p>
                ) : (
                  <>
                    {/* Identity */}
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 text-xl font-black"
                        style={{ background: 'rgba(56,120,224,0.15)', color: 'var(--r-blue)', border: '2px solid rgba(56,120,224,0.3)' }}
                      >
                        {(drawer.profile?.display_name || drawer.orders[0]?.customer_name || drawerEmail || '?')
                          .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-lg leading-snug" style={{ color: 'var(--color-text)' }}>
                          {drawer.profile
                            ? [drawer.profile.first_name, drawer.profile.last_name].filter(Boolean).join(' ') || drawer.profile.display_name || 'No name'
                            : drawer.orders[0]?.customer_name || 'Guest'}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{drawerEmail}</p>
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block"
                          style={drawer.profile
                            ? { background: 'rgba(136,68,216,0.12)', color: 'var(--r-violet)' }
                            : { background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}
                        >
                          {drawer.profile ? (drawer.profile.role === 'admin' ? 'Admin' : 'Account holder') : 'Guest'}
                        </span>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Orders',      value: drawer.orders.length, color: '#3ab870' },
                        { label: 'Lifetime Spend', value: fmtMoney(drawer.totalSpent), color: '#d4b030' },
                        { label: 'Last Order',  value: drawer.orders[0] ? fmtDate(drawer.orders[0].created_at) : '—', color: '#3878e0' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="p-3 rounded-xl text-center" style={{ background: 'var(--color-bg)', border: `1px solid ${color}22`, borderTop: `2px solid ${color}` }}>
                          <p className="text-sm font-black" style={{ color: 'var(--color-text)' }}>{value}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Contact info */}
                    <Section title="Contact" icon={Mail} color="#3878e0">
                      <InfoRow icon={Mail}  label="Email" value={drawerEmail ?? '—'} />
                      <InfoRow icon={Phone} label="Phone" value={drawer.profile?.phone || drawer.orders[0]?.customer_phone || '—'} />
                    </Section>

                    {/* Shipping address */}
                    <Section title="Address" icon={MapPin} color="#3ab870">
                      {(() => {
                        const src = drawer.profile || drawer.orders[0]
                        const addr = src
                          ? [src.address_line1, (src as Profile).address_line2 || null, src.city, src.state, src.zip].filter(Boolean).join(', ')
                          : null
                        return <InfoRow icon={MapPin} label="Shipping" value={addr || '—'} />
                      })()}
                    </Section>

                    {/* Account info */}
                    {drawer.profile && (
                      <Section title="Account" icon={Calendar} color="#8844d8">
                        <InfoRow icon={Calendar} label="Member since" value={fmtDate(drawer.profile.created_at)} />

                        {/* Birthday — editable */}
                        <div className="flex items-start gap-3 mt-2">
                          <div className="p-1.5 rounded-lg shrink-0" style={{ background: 'rgba(136,68,216,0.10)' }}>
                            <Gift size={14} style={{ color: 'var(--r-violet)' }} />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Birthday</p>
                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                value={drawer.editBirthday}
                                onChange={e => setDrawer(d => d ? { ...d, editBirthday: e.target.value } : d)}
                                className="cyber-input text-sm flex-1"
                                style={{ padding: '0.4rem 0.75rem' }}
                              />
                              <button
                                onClick={saveBirthday}
                                disabled={drawer.savingBd}
                                className="cyber-btn btn--violet btn--sm flex items-center gap-1 shrink-0"
                              >
                                {drawer.savingBd
                                  ? <Loader size={12} className="animate-spin" />
                                  : drawer.bdSaved
                                    ? <><CheckCircle size={12} /> Saved</>
                                    : <><Save size={12} /> Save</>
                                }
                              </button>
                            </div>
                            {drawer.profile.birthday && (
                              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                                🎂 {new Date(drawer.profile.birthday + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>
                      </Section>
                    )}

                    {/* Order history */}
                    <Section title={`Order History (${drawer.orders.length})`} icon={ShoppingCart} color="#d4b030">
                      {drawer.orders.length === 0 ? (
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No orders found.</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {drawer.orders.map(o => {
                            const sm = STATUS_META[o.status] ?? STATUS_META.pending
                            const SmIcon = sm.icon
                            return (
                              <div
                                key={o.id}
                                className="flex items-center justify-between gap-3 p-3 rounded-xl"
                                style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-mono text-xs font-bold" style={{ color: 'var(--color-text)' }}>{shortId(o.id)}</span>
                                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{fmtDate(o.created_at)}</span>
                                  </div>
                                  <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                                    {o.items?.length ?? 0} item{(o.items?.length ?? 0) !== 1 ? 's' : ''} · {o.payment_method ?? 'unknown payment'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-black text-sm" style={{ color: 'var(--color-text)' }}>{fmtMoney(o.total)}</span>
                                  <span
                                    className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                                    style={{ background: `${sm.color}18`, color: sm.color }}
                                  >
                                    <SmIcon size={10} /> {sm.label}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </Section>

                    {/* External link to profile if account holder */}
                    {drawer.profile && (
                      <a
                        href={`/admin/users`}
                        className="flex items-center gap-2 text-sm font-semibold"
                        style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
                        target="_blank" rel="noreferrer"
                      >
                        <ExternalLink size={14} /> View in User Management
                      </a>
                    )}
                  </>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Drawer section wrapper ── */

function Section({
  title, icon: Icon, color, children,
}: {
  title: string; icon: React.ElementType; color: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
        <Icon size={13} style={{ color }} />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{title}</span>
      </div>
      <div className="px-4 py-3 flex flex-col gap-2" style={{ background: 'var(--color-surface)' }}>
        {children}
      </div>
    </div>
  )
}

/* ── Info row ── */

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-1.5 rounded-lg shrink-0" style={{ background: 'var(--color-bg)' }}>
        <Icon size={13} style={{ color: 'var(--color-text-muted)' }} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text)' }}>{value || '—'}</p>
      </div>
    </div>
  )
}

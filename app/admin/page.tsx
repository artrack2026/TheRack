'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Package, MessageSquare, Users, ShoppingCart, ArrowRight, Settings } from 'lucide-react'
import Link from 'next/link'
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase'

interface Stats { products: number; inquiries: number; newInquiries: number; orders: number; users: number }

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ products: 0, inquiries: 0, newInquiries: 0, orders: 0, users: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    const supabase = getSupabaseClient()
    Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('inquiries').select('id', { count: 'exact', head: true }),
      supabase.from('inquiries').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ]).then(([p, inq, newInq, ord, usr]) => {
      setStats({
        products:     p.count     ?? 0,
        inquiries:    inq.count   ?? 0,
        newInquiries: newInq.count ?? 0,
        orders:       ord.count   ?? 0,
        users:        usr.count   ?? 0,
      })
      setLoading(false)
    })
  }, [])

  const statCards = [
    { label: 'Products',    value: stats.products,    icon: Package,      color: '#e05858', href: '/admin/products' },
    { label: 'Inquiries',   value: stats.inquiries,   icon: MessageSquare, color: '#e07838', href: '/admin/inquiries',
      badge: stats.newInquiries > 0 ? `${stats.newInquiries} new` : undefined },
    { label: 'Orders',      value: stats.orders,      icon: ShoppingCart,  color: '#3ab870', href: '/admin/orders' },
    { label: 'Customers',   value: stats.users,        icon: Users,         color: '#3878e0', href: '/admin/users' },
  ]

  const quickLinks = [
    { href: '/admin/products', label: 'Add Product', icon: Package },
    { href: '/admin/inquiries', label: 'View Inquiries', icon: MessageSquare },
    { href: '/admin/users', label: 'Manage Users', icon: Users },
    { href: '/admin/showroom', label: 'Showroom Settings', icon: Settings },
  ]

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mb-10">
        <p className="text-xs tracking-[0.3em] uppercase font-semibold mb-1" style={{ color: 'var(--r-violet)' }}>Admin</p>
        <h1 className="text-4xl font-black" style={{ color: 'var(--color-text)' }}>Dashboard</h1>
        <div className="h-1 w-12 mt-2" style={{ background: 'var(--r-violet)', borderRadius: 0 }} />
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {statCards.map(({ label, value, icon: Icon, color, href, badge }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.07 }}
          >
            <Link href={href} className="block p-5 transition-all duration-200 hover:-translate-y-0.5" style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderLeft: `3px solid ${color}`, borderRadius: '0 14px 14px 0',
            }}>
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg" style={{ background: `${color}18` }}>
                  <Icon size={16} style={{ color }} />
                </div>
                {badge && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>
                    {badge}
                  </span>
                )}
              </div>
              <p className="text-2xl font-black mb-0.5" style={{ color: 'var(--color-text)' }}>
                {loading ? '—' : value}
              </p>
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick links */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.3 }}>
        <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--color-text-muted)' }}>Quick Actions</p>
        <div className="flex flex-wrap gap-3">
          {quickLinks.map(({ href, label, icon: Icon }, index) => (
            <Link
              key={href}
              href={href}
              className="cyber-btn text-sm flex items-center gap-2"
              style={index === 0 ? { color: 'var(--r-violet)', borderColor: 'var(--r-violet)' } : {}}
            >
              <Icon size={14} />
              {label} <ArrowRight size={14} />
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

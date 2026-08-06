'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Package, MessageSquare, Users, LogOut, ChevronRight, Shield, Settings } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'

const adminLinks = [
  { href: '/admin',              label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products',     label: 'Products',  icon: Package },
  { href: '/admin/inquiries',    label: 'Inquiries', icon: MessageSquare },
  { href: '/admin/users',        label: 'Users',     icon: Users },
  { href: '/admin/showroom',     label: 'Showroom Settings', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login?from=/admin'); return }
    if (profile?.must_change_password) { router.replace('/auth/change-password'); return }
    if (profile && profile.role !== 'admin') router.replace('/portal')
  }, [user, profile, loading, router])

  const ready = !loading && user && profile?.role === 'admin' && !profile?.must_change_password

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--r-violet)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-28 flex flex-col lg:flex-row gap-8">
      {/* Sidebar */}
      <aside className="lg:w-56 shrink-0">
        <div
          className="sticky top-24 p-1"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px' }}
        >
          {/* Admin badge */}
          <div className="px-4 py-3 flex items-center gap-2">
            <Shield size={13} style={{ color: 'var(--r-violet)' }} />
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--r-violet)' }}>
              Admin
            </span>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', marginBottom: '4px' }} />

          {adminLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  color:      isActive ? 'var(--color-bg)' : 'var(--color-text-muted)',
                  background: isActive ? 'var(--r-violet)' : 'transparent',
                }}
              >
                <Icon size={15} />
                {label}
                {isActive && <ChevronRight size={12} className="ml-auto" />}
              </Link>
            )
          })}

          <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />

          <button
            onClick={() => { window.location.href = '/api/auth/signout' }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm w-full transition-colors hover:bg-white/5"
            style={{ color: 'var(--r-red)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { User, Package, LogOut, Home, ChevronRight } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'

const portalLinks = [
  { href: '/portal',         label: 'Dashboard', icon: Home },
  { href: '/portal/orders',  label: 'My Orders',  icon: Package },
  { href: '/portal/profile', label: 'Profile',    icon: User },
]

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) router.replace('/login?from=/portal')
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-28 flex flex-col lg:flex-row gap-8">
      {/* Sidebar */}
      <aside className="lg:w-56 shrink-0">
        <div
          className="sticky top-24 p-1"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '14px' }}
        >
          {portalLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group"
                style={{
                  color:      isActive ? 'var(--color-bg)' : 'var(--color-text-muted)',
                  background: isActive ? 'var(--color-primary)' : 'transparent',
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

      {/* Main content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ShoppingBag, Settings, LogOut, User, LayoutDashboard, Shield } from 'lucide-react'
import LogoText from '@/components/LogoText'
import { useAuth } from '@/components/AuthProvider'
import { useCart } from '@/components/CartProvider'

const navLinks = [
  { href: '/',        label: 'Home' },
  { href: '/shop',    label: 'Shop' },
  { href: '/about',   label: 'About' },
  { href: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [open, setOpen]           = useState(false)
  const [scrolled, setScrolled]   = useState(false)
  const [userMenu, setUserMenu]   = useState(false)
  const pathname                  = usePathname()
  const router                    = useRouter()
  const { user, profile, isAdmin, signOut } = useAuth()
  const { itemCount, openCart }   = useCart()
  const menuRef                   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setOpen(false); setUserMenu(false) }, [pathname])

  /* Close user menu on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      style={{
        background: scrolled ? 'rgba(28,28,26,0.94)' : 'transparent',
        borderBottom: scrolled ? '1px solid var(--color-border)' : '1px solid transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
      }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <LogoText className="text-xl" />
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="px-4 py-1.5 rounded-full text-sm font-medium tracking-wide transition-colors duration-200"
                style={{
                  color:      isActive ? 'var(--color-bg)' : 'var(--color-text-muted)',
                  background: isActive ? 'var(--color-primary)' : 'transparent',
                }}
              >
                {label}
              </Link>
            )
          })}
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-2">
          {/* Cart button */}
          <button
            onClick={openCart}
            className="relative p-2 rounded-full hover:bg-white/5 transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Open cart"
          >
            <ShoppingBag size={18} />
            {itemCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 flex items-center justify-center text-xs font-bold rounded-full"
                style={{
                  width: 17, height: 17,
                  background: 'var(--r-red)',
                  color: '#fff',
                  fontSize: '0.6rem',
                }}
              >
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </button>

          {/* User menu / login */}
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenu(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--color-primary)', color: 'var(--color-bg)' }}
                >
                  {(profile?.display_name?.[0] ?? user.email?.[0] ?? 'U').toUpperCase()}
                </div>
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                  {profile?.display_name ?? user.email?.split('@')[0]}
                </span>
              </button>

              <AnimatePresence>
                {userMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 py-1 min-w-[180px]"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    }}
                  >
                    <Link
                      href="/portal"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                      style={{ color: 'var(--color-text)' }}
                    >
                      <User size={14} /> My Portal
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                        style={{ color: 'var(--r-violet)' }}
                      >
                        <Shield size={14} /> Admin Panel
                      </Link>
                    )}
                    <Link
                      href="/settings"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <Settings size={14} /> Settings
                    </Link>
                    <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm w-full text-left transition-colors hover:bg-white/5"
                      style={{ color: 'var(--r-red)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile: cart + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={openCart}
            className="relative p-2 rounded-full"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Open cart"
          >
            <ShoppingBag size={20} />
            {itemCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 flex items-center justify-center text-xs font-bold rounded-full"
                style={{ width: 16, height: 16, background: 'var(--r-red)', color: '#fff', fontSize: '0.55rem' }}
              >
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded-full hover:bg-white/5 transition-colors"
            style={{ color: 'var(--color-text)' }}
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="md:hidden overflow-hidden"
            style={{ background: 'rgba(28,28,26,0.97)', borderBottom: '1px solid var(--color-border)' }}
          >
            <div className="px-6 py-5 flex flex-col gap-1">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    color: pathname === href ? 'var(--color-primary)' : 'var(--color-text)',
                    background: pathname === href ? 'rgba(200,144,42,0.1)' : 'transparent',
                  }}
                >
                  {label}
                </Link>
              ))}

              <div style={{ borderTop: '1px solid var(--color-border)', margin: '8px 0' }} />

              {user ? (
                <>
                  <Link href="/portal" className="px-4 py-2.5 rounded-lg text-sm flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                    <User size={14} /> My Portal
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" className="px-4 py-2.5 rounded-lg text-sm flex items-center gap-2" style={{ color: 'var(--r-violet)' }}>
                      <LayoutDashboard size={14} /> Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2.5 rounded-lg text-sm text-left flex items-center gap-2"
                    style={{ color: 'var(--r-red)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </>
              ) : (
                <Link href="/login" className="px-4 py-2.5 rounded-lg text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  Sign In
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

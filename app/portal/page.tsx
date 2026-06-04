'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Package, User, ShoppingBag, ArrowRight } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { useCart } from '@/components/CartProvider'
import { getDisplayName } from '@/lib/format'

const RAINBOW = ['#e05858','#e07838','#d4b030','#3ab870','#1ab4c0','#3878e0','#8844d8','#d84490']

export default function PortalPage() {
  const { user, profile } = useAuth()
  const { cart, openCart } = useCart()

  const name = getDisplayName(profile, user)
  const cartCount = cart?.items.reduce((n, i) => n + i.quantity, 0) ?? 0

  const cards = [
    {
      icon: Package,
      label: 'My Orders',
      desc: 'View your order history and tracking.',
      href: '/portal/orders',
      color: '#3ab870',
    },
    {
      icon: User,
      label: 'Profile',
      desc: 'Update your name, address, and contact info.',
      href: '/portal/profile',
      color: '#3878e0',
    },
    {
      icon: ShoppingBag,
      label: 'Active Cart',
      desc: cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? 's' : ''} reserved for 48 hrs.` : 'Your cart is empty.',
      href: '#',
      color: '#d4b030',
      onClick: openCart,
    },
  ]

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <p className="text-xs tracking-[0.3em] uppercase font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>
          Customer Portal
        </p>
        <h1 className="text-4xl font-black" style={{ color: 'var(--color-text)' }}>
          Welcome back, {name}
        </h1>
        <div className="h-1 w-12 mt-2" style={{ background: 'var(--color-primary)', borderRadius: 0}} />
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(({ icon: Icon, label, desc, href, color, onClick }, i) => {
          const Wrapper = onClick ? 'button' : Link
          const props = onClick
            ? { onClick, type: 'button' as const, style: { textAlign: 'left' as const } }
            : { href }
          return (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              {/* @ts-expect-error dynamic element */}
              <Wrapper
                {...props}
                className="block w-full group p-6 transition-all duration-200"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderLeft: `3px solid ${color}`,
                  borderRadius: '0 14px 14px 0',
                  cursor: 'pointer',
                }}
              >
                <div
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4"
                  style={{ background: `${color}18` }}
                >
                  <Icon size={20} style={{ color }} />
                </div>
                <p className="font-bold text-base mb-1" style={{ color: 'var(--color-text)' }}>{label}</p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
                {href !== '#' && (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-semibold mt-3 tracking-widest uppercase"
                    style={{ color }}
                  >
                    Go <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </Wrapper>
            </motion.div>
          )
        })}
      </div>

      {/* Rainbow swatches — decorative */}
      <div className="flex gap-1.5 mt-12">
        {RAINBOW.map((c, i) => (
          <div key={i} style={{ width: 24, height: 6, background: c, borderRadius: i === 0 ? '99px 0 0 99px' : i === RAINBOW.length - 1 ? '0 99px 99px 0' : 0 }} />
        ))}
      </div>
    </div>
  )
}

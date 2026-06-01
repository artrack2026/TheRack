'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingBag, Trash2, Clock, ArrowRight, Loader } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/components/CartProvider'

const RAINBOW = ['#e05858','#e07838','#d4b030','#3ab870','#1ab4c0','#3878e0','#8844d8','#d84490']
const color = (i: number) => RAINBOW[i % RAINBOW.length]

/* How many hours remain on the cart */
function hoursLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function CartDrawer() {
  const { cart, isOpen, closeCart, removeItem, loading } = useCart()

  const total = cart?.items.reduce((s, i) => s + i.price * i.quantity, 0) ?? 0

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            onClick={closeCart}
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="fixed top-0 right-0 h-full z-50 flex flex-col"
            style={{
              width: 'min(420px, 100vw)',
              background: 'var(--color-surface)',
              borderLeft: '1px solid var(--color-border)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} style={{ color: 'var(--color-primary)' }} />
                <span className="font-bold text-base" style={{ color: 'var(--color-text)' }}>
                  Your Cart
                </span>
                {cart && cart.items.length > 0 && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--color-primary)', color: 'var(--color-bg)' }}
                  >
                    {cart.items.reduce((n, i) => n + i.quantity, 0)}
                  </span>
                )}
              </div>
              <button
                onClick={closeCart}
                className="p-2 rounded-full hover:bg-white/5 transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                aria-label="Close cart"
              >
                <X size={18} />
              </button>
            </div>

            {/* Expiry notice */}
            {cart && (
              <div
                className="flex items-center gap-2 px-6 py-2 text-xs"
                style={{
                  background: 'rgba(212,176,48,0.08)',
                  borderBottom: '1px solid var(--color-border)',
                  color: 'var(--r-yellow)',
                }}
              >
                <Clock size={12} />
                Cart reserved for {hoursLeft(cart.expires_at)} — items return to shelf after 48 hrs
              </div>
            )}

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {!cart || cart.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <ShoppingBag size={48} style={{ color: 'var(--color-border)' }} />
                  <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    Your cart is empty
                  </p>
                  <button
                    onClick={closeCart}
                    className="cyber-btn text-xs"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {cart.items.map((item, i) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 40 }}
                      className="flex gap-3 items-start"
                      style={{
                        padding: '12px',
                        background: 'var(--color-bg)',
                        borderRadius: '12px',
                        borderLeft: `3px solid ${color(i)}`,
                      }}
                    >
                      {/* Image */}
                      <div
                        className="relative shrink-0 rounded-lg overflow-hidden"
                        style={{ width: 64, height: 64, background: 'var(--color-surface)' }}
                      >
                        <Image
                          src={item.image || '/images/placeholder.svg'}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-semibold text-sm leading-snug truncate"
                          style={{ color: 'var(--color-text)' }}
                        >
                          {item.title}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: color(i) }}
                        >
                          {item.category}
                        </p>
                        <p
                          className="text-sm font-black mt-1"
                          style={{ color: 'var(--color-text)' }}
                        >
                          ${(item.price * item.quantity).toFixed(2)}
                          {item.quantity > 1 && (
                            <span className="text-xs font-normal ml-1" style={{ color: 'var(--color-text-muted)' }}>
                              × {item.quantity}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={loading}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors shrink-0"
                        style={{ color: 'var(--color-text-muted)' }}
                        aria-label="Remove item"
                      >
                        {loading ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {cart && cart.items.length > 0 && (
              <div
                className="px-6 py-5 flex flex-col gap-3"
                style={{ borderTop: '1px solid var(--color-border)' }}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    Subtotal
                  </span>
                  <span className="text-lg font-black" style={{ color: 'var(--color-text)' }}>
                    ${total.toFixed(2)}
                  </span>
                </div>
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="cyber-btn w-full justify-center"
                >
                  Proceed to Checkout <ArrowRight size={15} />
                </Link>
                <button
                  onClick={closeCart}
                  className="text-xs text-center w-full"
                  style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

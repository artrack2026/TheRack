'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { CheckCircle, Package, ArrowRight, Home, UserPlus } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'

function SuccessContent() {
  const params               = useSearchParams()
  const orderId              = params.get('id')
  const totalParam           = params.get('total')
  const newAccount           = params.get('newAccount') === '1'
  const { user }             = useAuth()
  const [instructions, setInstructions] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('order_instructions')
    if (stored) { setInstructions(stored); sessionStorage.removeItem('order_instructions') }
  }, [])

  const short = orderId ? orderId.split('-')[0].toUpperCase() : '—'

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      className="w-full max-w-lg flex flex-col items-center text-center gap-6"
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.2 }}
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(58,184,112,0.12)', border: '2px solid var(--r-green)' }}
      >
        <CheckCircle size={40} style={{ color: 'var(--r-green)' }} />
      </motion.div>

      {/* Heading */}
      <div>
        <p className="text-xs tracking-[0.3em] uppercase font-semibold mb-2" style={{ color: 'var(--r-green)' }}>
          Order Placed
        </p>
        <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--color-text)' }}>
          Thank you!
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Your order has been received and is awaiting payment confirmation.
        </p>
      </div>

      {/* Order details card */}
      <div
        className="w-full p-5 rounded-2xl flex flex-col gap-3 text-left"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--r-green)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Package size={16} style={{ color: 'var(--r-green)' }} />
          <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Order Details</span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--color-text-muted)' }}>Order #</span>
          <span className="font-mono font-bold" style={{ color: 'var(--color-text)' }}>{short}</span>
        </div>
        {totalParam && (
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-text-muted)' }}>Total</span>
            <span className="font-black" style={{ color: 'var(--color-accent)' }}>
              ${parseFloat(totalParam).toFixed(2)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--color-text-muted)' }}>Status</span>
          <span className="font-semibold px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(212,176,48,0.12)', color: 'var(--r-yellow)' }}>
            Pending Payment
          </span>
        </div>
      </div>

      {/* New account notice */}
      {newAccount && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="w-full p-4 rounded-xl flex items-start gap-3 text-left"
          style={{ background: 'rgba(56,120,224,0.08)', border: '1px solid rgba(56,120,224,0.2)' }}
        >
          <UserPlus size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--r-blue)' }} />
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
            We&apos;ve created an account for you with {' '}
            <span className="font-semibold">{user?.email}</span> and signed you in — you&apos;re all
            set to track this order and edit your details under{' '}
            <Link href="/portal/profile" className="underline">My Profile</Link>.
          </p>
        </motion.div>
      )}

      {/* Payment instructions */}
      {instructions && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full p-5 rounded-2xl text-left"
          style={{ background: 'rgba(136,68,216,0.06)', border: '1px solid rgba(136,68,216,0.2)' }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--r-violet)' }}>
            Payment Instructions
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text)' }}>
            {instructions}
          </p>
          <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
            Please include your order # <strong>{short}</strong> in the payment reference.
          </p>
        </motion.div>
      )}

      {/* What's next */}
      <div
        className="w-full p-4 rounded-xl text-left text-sm"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      >
        <p className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>What happens next?</p>
        <ol className="flex flex-col gap-1.5 list-none" style={{ color: 'var(--color-text-muted)' }}>
          <li>1. Send payment using the method selected above</li>
          <li>2. We verify receipt and update your order status</li>
          <li>3. Your item ships — you&apos;ll receive tracking info</li>
        </ol>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        {user && (
          <Link href="/portal/orders" className="cyber-btn btn--green flex items-center gap-2">
            <Package size={15} /> View My Orders <ArrowRight size={14} />
          </Link>
        )}
        <Link href="/shop" className="cyber-btn art-btn-ghost flex items-center gap-2">
          <Home size={15} /> Continue Shopping
        </Link>
      </div>
    </motion.div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-bg)' }}>
      <Suspense fallback={
        <div className="w-20 h-20 rounded-full animate-pulse" style={{ background: 'var(--color-surface)' }} />
      }>
        <SuccessContent />
      </Suspense>
    </div>
  )
}

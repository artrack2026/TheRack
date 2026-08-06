'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader, CheckCircle, AlertCircle, ArrowLeft, Banknote, Wallet, CreditCard, RotateCcw } from 'lucide-react'
import { Order, OrderItem, RefundMethod } from '@/lib/types'
import { money, shortOrderId } from '@/lib/invoice'

interface Props {
  order: (Order & { items?: OrderItem[] }) | null
  onClose: () => void
  onSuccess: (order: Order) => void
}

type Stage = 'scope' | 'method' | 'result'

const METHOD_META: Record<RefundMethod, { label: string; icon: typeof Banknote; note: (ctx: { amount: string; email: string; method: string }) => string }> = {
  cash: {
    label: 'Cash',
    icon: Banknote,
    note: () => 'Hand the customer cash for this amount. Nothing else happens automatically.',
  },
  store_credit: {
    label: 'Store Credit',
    icon: Wallet,
    note: ({ amount, email }) => `A ${amount} credit will be added to ${email}'s store-credit balance.`,
  },
  original_payment_method: {
    label: 'Original Payment Method',
    icon: CreditCard,
    note: ({ amount, method }) => `This won't process automatically — refund ${amount} via ${method} yourself, then confirm here to record that it was done.`,
  },
}

export default function RefundModal({ order, onClose, onSuccess }: Props) {
  const [stage, setStage]           = useState<Stage>('scope')
  const [isFullRefund, setIsFull]   = useState<boolean | null>(null)
  const [partialAmount, setPartial] = useState('')
  const [method, setMethod]         = useState<RefundMethod | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [result, setResult]         = useState<{ amount: number; method: RefundMethod; storeCreditBalance: number | null } | null>(null)

  useEffect(() => {
    if (order) {
      setStage('scope')
      setIsFull(null)
      setPartial('')
      setMethod(null)
      setError(null)
      setResult(null)
    }
  }, [order])

  const amountPaid = order?.amount_paid ?? 0
  const refundAmount = isFullRefund ? amountPaid : Math.max(0, parseFloat(partialAmount) || 0)
  const partialValid = refundAmount > 0 && refundAmount <= amountPaid

  const chooseFull = () => { setIsFull(true); setStage('method') }
  const continuePartial = () => { if (partialValid) { setIsFull(false); setStage('method') } }

  const submit = async () => {
    if (!method || !order) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isFullRefund: !!isFullRefund,
          amount: isFullRefund ? undefined : refundAmount,
          method,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to process refund')

      onSuccess(data.order as Order)
      setResult({ amount: data.refundAmount, method, storeCreditBalance: data.storeCreditBalance ?? null })
      setStage('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to process refund')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {order && (
      <motion.div
        key="refund-bg"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.65)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          key="refund-panel"
          initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="w-full flex flex-col overflow-hidden"
          style={{ maxWidth: 460, maxHeight: '90vh', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '18px' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-2.5">
              <RotateCcw size={16} style={{ color: 'var(--r-red)' }} />
              <p className="font-bold" style={{ color: 'var(--color-text)' }}>Void / Refund — #{shortOrderId(order.id)}</p>
            </div>
            <button onClick={onClose} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>

          <div className="px-6 py-6 overflow-y-auto flex flex-col gap-5">
            {/* Context banner, shown on every stage except the result */}
            {stage !== 'result' && (
              <div className="p-3.5 rounded-xl flex flex-col gap-1.5" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--color-text-muted)' }}>Original Payment Method</span>
                  <span style={{ color: 'var(--color-text)' }}>
                    {order.payment_method || 'Not specified'}{order.payment_detail ? ` — ${order.payment_detail}` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--color-text-muted)' }}>Amount Owed as Refund</span>
                  <span className="font-bold" style={{ color: 'var(--r-green)' }}>{money(amountPaid)}</span>
                </div>
              </div>
            )}

            {stage === 'scope' && (
              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Full refund or partial?</p>
                <button onClick={chooseFull} className="cyber-btn btn--red flex items-center justify-center gap-1.5">
                  Full Refund — {money(amountPaid)}
                </button>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <div className="flex-1" style={{ height: 1, background: 'var(--color-border)' }} /> or <div className="flex-1" style={{ height: 1, background: 'var(--color-border)' }} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs tracking-widest uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                    Partial Refund Amount
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" step="0.01" min="0" max={amountPaid}
                      value={partialAmount}
                      onChange={e => setPartial(e.target.value)}
                      placeholder="0.00"
                      className="cyber-input flex-1"
                    />
                    <button onClick={continuePartial} disabled={!partialValid} className="cyber-btn btn--sm shrink-0">
                      Continue
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Recorded on the invoice as a Post-Sale Discount, not a status change.
                  </p>
                </div>
              </div>
            )}

            {stage === 'method' && (
              <div className="flex flex-col gap-4">
                <button onClick={() => setStage('scope')} className="flex items-center gap-1 text-xs w-fit" style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <ArrowLeft size={12} /> Back
                </button>

                <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(191,91,74,0.08)', border: '1px solid rgba(191,91,74,0.2)', color: 'var(--color-text)' }}>
                  {isFullRefund
                    ? <>Refunding the full <strong>{money(refundAmount)}</strong> paid. Order status will change to <strong>Refunded</strong>.</>
                    : <>Refunding <strong>{money(refundAmount)}</strong> of {money(amountPaid)} paid, as a post-sale discount.</>
                  }
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-xs tracking-widest uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                    Return the payment as
                  </p>
                  {(Object.keys(METHOD_META) as RefundMethod[]).map(key => {
                    const meta = METHOD_META[key]
                    const Icon = meta.icon
                    const active = method === key
                    return (
                      <button
                        key={key}
                        onClick={() => setMethod(key)}
                        className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm text-left transition-colors"
                        style={{
                          background: active ? 'var(--color-accent)' : 'var(--color-bg)',
                          color: active ? 'var(--color-bg)' : 'var(--color-text)',
                          border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        }}
                      >
                        <Icon size={15} /> {meta.label}
                      </button>
                    )
                  })}
                  {method && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      {METHOD_META[method].note({ amount: money(refundAmount), email: order.customer_email, method: order.payment_method || 'the original method' })}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(224,88,88,0.1)', color: 'var(--r-red)', border: '1px solid rgba(224,88,88,0.25)' }}>
                    <AlertCircle size={14} /> {error}
                  </div>
                )}

                <button onClick={submit} disabled={!method || submitting} className="cyber-btn btn--red flex items-center justify-center gap-1.5">
                  {submitting ? <><Loader size={14} className="animate-spin" /> Processing…</> : <>Confirm Refund</>}
                </button>
              </div>
            )}

            {stage === 'result' && result && (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle size={40} style={{ color: 'var(--r-green)' }} />
                <div>
                  <p className="font-bold" style={{ color: 'var(--color-text)' }}>Refund Recorded</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {money(result.amount)} via {METHOD_META[result.method].label}
                  </p>
                  {result.storeCreditBalance !== null && (
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      New store-credit balance for {order.customer_email}: <strong style={{ color: 'var(--color-text)' }}>{money(result.storeCreditBalance)}</strong>
                    </p>
                  )}
                </div>
                <button onClick={onClose} className="cyber-btn btn--sm mt-1">Done</button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Printer, Download, Mail, Loader, CheckCircle, AlertCircle, Save, DollarSign, RotateCcw } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { Order, OrderItem, OrderRefund, Profile } from '@/lib/types'
import { buildInvoiceHtml, downloadInvoicePdf, shortOrderId } from '@/lib/invoice'
import RefundModal from './RefundModal'

interface Props {
  orderId: string | null
  onClose: () => void
  onOrderUpdate?: (order: Order & { items?: OrderItem[] }) => void
}

export default function InvoiceModal({ orderId, onClose, onOrderUpdate }: Props) {
  const [order, setOrder]     = useState<(Order & { items?: OrderItem[] }) | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [refunds, setRefunds] = useState<OrderRefund[]>([])
  const [loading, setLoading] = useState(false)

  const [amountPaid, setAmountPaid]   = useState('')
  const [savingPaid, setSavingPaid]   = useState(false)
  const [paidSaved, setPaidSaved]     = useState(false)

  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [emailError, setEmailError] = useState<string | null>(null)

  const [refundOpen, setRefundOpen] = useState(false)

  const load = useCallback(async (id: string) => {
    setLoading(true)
    setEmailState('idle')
    setPaidSaved(false)
    try {
      const sb = getSupabaseClient()
      const { data: orderData } = await sb
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('id', id)
        .single()

      const o = orderData as (Order & { items?: OrderItem[] }) | null
      setOrder(o)
      setAmountPaid(o ? String(o.amount_paid) : '0')

      const { data: refundData } = await sb
        .from('order_refunds')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: true })
      setRefunds((refundData as OrderRefund[]) ?? [])

      if (o?.customer_email) {
        const { data: profileData } = await sb
          .from('profiles')
          .select('*')
          .eq('email', o.customer_email.toLowerCase())
          .maybeSingle()
        setProfile((profileData as Profile) ?? null)
      } else {
        setProfile(null)
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (orderId) load(orderId)
    else { setOrder(null); setProfile(null); setRefunds([]); setRefundOpen(false) }
  }, [orderId, load])

  const saveAmountPaid = async () => {
    if (!order) return
    const value = Math.max(0, parseFloat(amountPaid) || 0)
    setSavingPaid(true)
    try {
      const sb = getSupabaseClient()
      await sb.from('orders').update({ amount_paid: value }).eq('id', order.id)
      const updated = { ...order, amount_paid: value }
      setOrder(updated)
      onOrderUpdate?.(updated)
      setPaidSaved(true)
      setTimeout(() => setPaidSaved(false), 2500)
    } catch { /* silent */ }
    finally { setSavingPaid(false) }
  }

  const handleRefundSuccess = (updated: Order) => {
    const merged = order ? { ...order, ...updated } : updated
    setOrder(merged)
    setAmountPaid(String(updated.amount_paid))
    onOrderUpdate?.(merged)
    if (order) load(order.id) // pick up the new order_refunds row for the invoice/discount line
  }

  const sendInvoiceEmail = async () => {
    if (!order) return
    setEmailState('sending')
    setEmailError(null)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/send-invoice`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send invoice')
      setEmailState('sent')
      setTimeout(() => setEmailState('idle'), 3000)
    } catch (e) {
      setEmailState('error')
      setEmailError(e instanceof Error ? e.message : 'Failed to send invoice')
    }
  }

  const invoiceHtml = order ? buildInvoiceHtml({ order, profile, refunds }) : ''

  return (
    <AnimatePresence>
      {orderId && (
        <>
          <motion.div
            key="invoice-bg"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 no-print"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={onClose}
          />

          <motion.div
            key="invoice-panel"
            initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed z-50 flex flex-col overflow-hidden"
            style={{
              top: '4vh', left: '50%', transform: 'translateX(-50%)',
              width: 'min(760px, 94vw)', maxHeight: '92vh',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '1rem',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 no-print" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <span className="font-bold" style={{ color: 'var(--color-text)' }}>
                  Invoice {order ? `#${shortOrderId(order.id)}` : ''}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/5 transition-colors"
                style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {loading || !order ? (
                <div className="flex items-center justify-center gap-2 py-20" style={{ color: 'var(--color-text-muted)' }}>
                  <Loader size={20} className="animate-spin" /> Loading invoice…
                </div>
              ) : (
                <>
                  <div className="invoice-printable">
                    <div dangerouslySetInnerHTML={{ __html: invoiceHtml }} />
                  </div>

                  {/* Amount paid editor */}
                  <div className="mt-6 p-4 rounded-xl no-print" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
                      <DollarSign size={12} /> Record Payment Received
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" step="0.01" min="0" value={amountPaid}
                        onChange={e => setAmountPaid(e.target.value)}
                        className="cyber-input text-sm flex-1" style={{ padding: '0.4rem 0.75rem' }}
                      />
                      <button onClick={saveAmountPaid} disabled={savingPaid} className="cyber-btn btn--green btn--sm flex items-center gap-1 shrink-0">
                        {savingPaid ? <Loader size={12} className="animate-spin" /> : paidSaved ? <><CheckCircle size={12} /> Saved</> : <><Save size={12} /> Save</>}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer actions */}
            {order && (
              <div className="flex items-center justify-end gap-2 px-6 py-4 no-print flex-wrap" style={{ borderTop: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-2 mr-auto flex-wrap">
                  {emailState === 'error' && (
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--r-red)' }}>
                      <AlertCircle size={12} /> {emailError}
                    </span>
                  )}
                  {order.amount_paid > 0 && (
                    <button onClick={() => setRefundOpen(true)} className="cyber-btn btn--red btn--sm flex items-center gap-1.5">
                      <RotateCcw size={13} /> Void / Refund
                    </button>
                  )}
                </div>
                <button onClick={() => window.print()} className="cyber-btn btn--sm flex items-center gap-1.5">
                  <Printer size={13} /> Print
                </button>
                <button onClick={() => downloadInvoicePdf({ order, profile, refunds })} className="cyber-btn btn--sm flex items-center gap-1.5">
                  <Download size={13} /> Download
                </button>
                <button onClick={sendInvoiceEmail} disabled={emailState === 'sending'} className="cyber-btn btn--blue btn--sm flex items-center gap-1.5">
                  {emailState === 'sending'
                    ? <><Loader size={13} className="animate-spin" /> Sending…</>
                    : emailState === 'sent'
                      ? <><CheckCircle size={13} /> Sent</>
                      : <><Mail size={13} /> Email to Customer</>
                  }
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}

      {order && (
        <RefundModal
          order={refundOpen ? order : null}
          onClose={() => setRefundOpen(false)}
          onSuccess={handleRefundSuccess}
        />
      )}
    </AnimatePresence>
  )
}

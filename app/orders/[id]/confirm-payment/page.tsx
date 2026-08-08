'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { CheckCircle, ExternalLink, Loader, AlertCircle, Clock, ArrowRight } from 'lucide-react'
import { buildPaymentRedirectUrl } from '@/lib/payment-redirect'

interface Summary {
  orderNumber: string
  total: number
  paymentMethodName: string | null
  paymentDetail: string | null
  paymentInstructions: string | null
  paymentType: string | null
  paymentRedirectUrl: string | null
  alreadySubmitted: boolean
  submittedCode: string | null
}

function ConfirmPaymentContent() {
  const params      = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router       = useRouter()
  const orderId      = params.id

  // Present only on the immediate post-checkout visit — absent when
  // reached later from the reminder email, which is how we tell those two
  // cases apart (see handleSubmitted/handleSkip below).
  const cameFromCheckout = searchParams.has('total')
  const successParams    = cameFromCheckout ? `?${searchParams.toString()}` : ''

  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [code, setCode]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted]   = useState(false)

  const [skipping, setSkipping]   = useState(false)
  const [skipped, setSkipped]     = useState(false)
  const [skipError, setSkipError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/orders/${orderId}/payment-confirmation`)
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return
        if (!ok) { setLoadError(data.error ?? 'Order not found'); return }
        setSummary(data)
      })
      .catch(() => { if (!cancelled) setLoadError('Failed to load order') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [orderId])

  const goToSuccess = () => {
    router.push(`/checkout/success${successParams}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res  = await fetch(`/api/orders/${orderId}/payment-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setSubmitError(data.error ?? 'Failed to save confirmation code'); return }
      setSubmitted(true)
      if (cameFromCheckout) goToSuccess()
    } catch {
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = async () => {
    setSkipping(true)
    setSkipError(null)
    try {
      const res  = await fetch(`/api/orders/${orderId}/payment-confirmation/remind`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Don't claim an email went out when it didn't, and don't strand
        // the customer here either — the order's already placed, so let
        // them continue on their own if they don't want to retry.
        setSkipError(data.error ?? 'Failed to send the reminder email.')
        return
      }
      setSkipped(true)
      if (cameFromCheckout) goToSuccess()
    } catch {
      setSkipError('Failed to send the reminder email.')
    } finally {
      setSkipping(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size={24} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>
    )
  }

  if (loadError || !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle size={28} style={{ color: 'var(--r-red)' }} />
          <p style={{ color: 'var(--color-text)' }}>{loadError ?? "Couldn't find that order."}</p>
          <Link href="/shop" className="cyber-btn text-sm mt-2">Back to Shop</Link>
        </div>
      </div>
    )
  }

  // Only redirect-type methods (Venmo/Cash App/PayPal.me) use this screen —
  // anything else landing here somehow just moves along.
  if (summary.paymentType !== 'redirect') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle size={28} style={{ color: 'var(--r-green)' }} />
          <p style={{ color: 'var(--color-text)' }}>This order doesn&apos;t need a payment confirmation code.</p>
          <Link href={`/checkout/success${successParams}`} className="cyber-btn text-sm mt-2">Continue</Link>
        </div>
      </div>
    )
  }

  const payUrl = summary.paymentRedirectUrl
    ? buildPaymentRedirectUrl(summary.paymentRedirectUrl, summary.total)
    : null

  const alreadyDone = summary.alreadySubmitted || submitted

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{ background: 'var(--color-bg)' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="w-full max-w-lg flex flex-col gap-6"
      >
        <div className="text-center">
          <p className="text-xs tracking-[0.3em] uppercase font-semibold mb-2" style={{ color: 'var(--color-accent)' }}>
            Order #{summary.orderNumber}
          </p>
          <h1 className="text-2xl font-black" style={{ color: 'var(--color-text)' }}>
            {alreadyDone ? 'Payment Confirmation Received' : 'Complete Your Payment'}
          </h1>
        </div>

        {alreadyDone ? (
          <div
            className="p-6 rounded-2xl flex flex-col items-center gap-3 text-center"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--r-green)' }}
          >
            <CheckCircle size={32} style={{ color: 'var(--r-green)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>
              Thanks — we&apos;ve got your confirmation code on file for this order.
            </p>
            {summary.submittedCode && (
              <p className="text-xs font-mono px-3 py-1.5 rounded-lg" style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>
                {summary.submittedCode}
              </p>
            )}
            {!cameFromCheckout && (
              <Link href="/shop" className="cyber-btn art-btn-ghost text-sm mt-2">Continue Shopping</Link>
            )}
          </div>
        ) : skipped ? (
          <div
            className="p-6 rounded-2xl flex flex-col items-center gap-3 text-center"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--r-yellow)' }}
          >
            <Clock size={32} style={{ color: 'var(--r-yellow)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>
              No problem — we&apos;ve emailed you a link so you can send us your confirmation code whenever you have it.
            </p>
            {!cameFromCheckout && (
              <Link href="/shop" className="cyber-btn art-btn-ghost text-sm mt-2">Continue Shopping</Link>
            )}
          </div>
        ) : (
          <>
            {/* Pay */}
            <div
              className="p-6 rounded-2xl flex flex-col gap-4"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--r-violet)' }}
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--r-violet)' }}>
                  Step 1
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                  Send <strong>${summary.total.toFixed(2)}</strong> via {summary.paymentMethodName ?? 'your selected method'}.
                  {' '}Include your order number <strong>{summary.orderNumber}</strong> in the payment note if it lets you —
                  it helps us match your payment up faster.
                </p>
                {summary.paymentInstructions && (
                  <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
                    {summary.paymentInstructions}
                  </p>
                )}
                {summary.paymentDetail && (
                  <p className="text-xs font-mono mt-2 px-2 py-1 rounded w-fit" style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>
                    {summary.paymentDetail}
                  </p>
                )}
              </div>
              {payUrl ? (
                <a href={payUrl} target="_blank" rel="noreferrer" className="cyber-btn btn--violet w-fit flex items-center gap-2">
                  Pay via {summary.paymentMethodName ?? 'link'} <ExternalLink size={14} />
                </a>
              ) : (
                <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--r-yellow)' }}>
                  <AlertCircle size={12} /> No payment link is on file for this method — please contact us directly to arrange payment.
                </p>
              )}
            </div>

            {/* Confirm */}
            <form
              onSubmit={handleSubmit}
              className="p-6 rounded-2xl flex flex-col gap-4"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--r-green)' }}
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--r-green)' }}>
                  Step 2
                </p>
                <p className="text-sm mb-3" style={{ color: 'var(--color-text)' }}>
                  Once it goes through, paste the confirmation or transaction ID from {summary.paymentMethodName ?? 'the payment'} here.
                </p>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="e.g. transaction ID, confirmation code…"
                  className="cyber-input w-full"
                  autoComplete="off"
                />
              </div>

              {submitError && (
                <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--r-red)' }}>
                  <AlertCircle size={12} /> {submitError}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={submitting || !code.trim()} className="cyber-btn btn--green text-sm">
                  {submitting ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={14} />} Submit Confirmation
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={skipping}
                  className="cyber-btn art-btn-ghost text-sm flex items-center gap-1.5"
                >
                  {skipping ? <Loader size={14} className="animate-spin" /> : <Clock size={14} />}
                  Submit Later {cameFromCheckout && <ArrowRight size={13} />}
                </button>
              </div>

              {skipError && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--r-red)' }}>
                    <AlertCircle size={12} /> {skipError} Your order is still placed — you can retry, or just
                    continue and come back to this page later (bookmark it, or check &quot;My Orders&quot; if
                    you&apos;re signed in).
                  </p>
                  {cameFromCheckout && (
                    <button type="button" onClick={goToSuccess} className="cyber-btn art-btn-ghost text-xs w-fit">
                      Continue Without a Reminder
                    </button>
                  )}
                </div>
              )}

              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Choosing &quot;Submit Later&quot; won&apos;t hold up your order — we&apos;ll email you a link to come back
                and add it whenever you&apos;re ready, which just helps us verify things faster.
              </p>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}

export default function ConfirmPaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader size={24} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>
    }>
      <ConfirmPaymentContent />
    </Suspense>
  )
}

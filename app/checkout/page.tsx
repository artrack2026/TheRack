'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import {
  ShoppingBag, ChevronRight, AlertCircle, Loader, Check,
  Smartphone, Globe, FileText, CreditCard, Package,
} from 'lucide-react'
import { useCart } from '@/components/CartProvider'
import { useAuth } from '@/components/AuthProvider'
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import { PaymentMethod, CheckoutSettings } from '@/lib/types'

const RAINBOW = ['#e05858','#e07838','#d4b030','#3ab870','#1ab4c0','#3878e0','#8844d8','#d84490']
const rc = (i: number) => RAINBOW[i % RAINBOW.length]

const METHOD_ICONS: Record<string, React.ElementType> = {
  smartphone: Smartphone,
  globe:      Globe,
  'file-text':FileText,
  'credit-card': CreditCard,
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

interface Form {
  firstName:    string
  lastName:     string
  email:        string
  phone:        string
  address_line1:string
  address_line2:string
  city:         string
  state:        string
  zip:          string
  notes:        string
}

const EMPTY_FORM: Form = {
  firstName: '', lastName: '', email: '', phone: '',
  address_line1: '', address_line2: '', city: '', state: '', zip: '', notes: '',
}

function interpolateInstructions(text: string, detail?: string): string {
  return text.replace(/\{detail\}/g, detail ?? '').replace(/\{name\}/g, detail ?? '')
}

export default function CheckoutPage() {
  const { cart, clearCart }   = useCart()
  const { profile }           = useAuth()
  const router                = useRouter()

  const [form, setForm]               = useState<Form>(EMPTY_FORM)
  const [selectedMethod, setSelected] = useState<string>('')
  const [config, setConfig]           = useState<CheckoutSettings | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [touched, setTouched]         = useState<Partial<Record<keyof Form, boolean>>>({})

  // Pre-fill form from logged-in profile
  useEffect(() => {
    if (!profile) return
    setForm(prev => ({
      ...prev,
      firstName:     profile.first_name     ?? prev.firstName,
      lastName:      profile.last_name      ?? prev.lastName,
      email:         profile.email          || prev.email,
      phone:         profile.phone          ?? prev.phone,
      address_line1: profile.address_line1  ?? prev.address_line1,
      address_line2: profile.address_line2  ?? prev.address_line2,
      city:          profile.city           ?? prev.city,
      state:         profile.state          ?? prev.state,
      zip:           profile.zip            ?? prev.zip,
    }))
  }, [profile])

  // Redirect if cart is empty
  useEffect(() => {
    if (cart !== null && cart.items.length === 0) router.push('/shop')
  }, [cart, router])

  // Load checkout config (tax, shipping, payment methods)
  const loadConfig = useCallback(async () => {
    setLoadingConfig(true)
    try {
      if (!isSupabaseConfigured) {
        setConfig({ tax_rate: 0, shipping_fee: 0, free_shipping_threshold: 0, payment_methods: [] })
        return
      }
      const sb = getSupabaseClient()
      const { data } = await sb
        .from('showroom_settings')
        .select('tax_rate, shipping_fee, free_shipping_threshold, payment_methods')
        .eq('id', 1)
        .single()

      const methods: PaymentMethod[] = Array.isArray(data?.payment_methods)
        ? (data.payment_methods as PaymentMethod[]).filter(m => m.enabled).sort((a, b) => a.sort_order - b.sort_order)
        : []

      setConfig({
        tax_rate:               (data?.tax_rate            as number) ?? 0,
        shipping_fee:           (data?.shipping_fee        as number) ?? 0,
        free_shipping_threshold:(data?.free_shipping_threshold as number) ?? 0,
        payment_methods:        methods,
      })

      // Auto-select first enabled method
      if (methods.length > 0 && !selectedMethod) setSelected(methods[0].id)
    } catch {
      setConfig({ tax_rate: 0, shipping_fee: 0, free_shipping_threshold: 0, payment_methods: [] })
    } finally {
      setLoadingConfig(false)
    }
  }, [selectedMethod])

  useEffect(() => { loadConfig() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Derived totals
  const subtotal = cart?.items.reduce((s, i) => s + i.price * i.quantity, 0) ?? 0
  const shipping = config
    ? config.free_shipping_threshold > 0 && subtotal >= config.free_shipping_threshold
      ? 0
      : config.shipping_fee
    : 0
  const tax   = config ? Math.round(subtotal * config.tax_rate * 100) / 100 : 0
  const total = subtotal + shipping + tax

  // Field validation
  const required: (keyof Form)[] = ['firstName', 'lastName', 'email', 'address_line1', 'city', 'state', 'zip']
  const fieldError = (k: keyof Form) => {
    if (!touched[k]) return null
    if (required.includes(k) && !form[k].trim()) return 'Required'
    if (k === 'email' && form.email && !form.email.includes('@')) return 'Invalid email'
    return null
  }

  const formValid = required.every(k => form[k].trim()) && form.email.includes('@')

  const handleBlur = (k: keyof Form) => setTouched(t => ({ ...t, [k]: true }))
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Touch all required fields
    const allTouched = Object.fromEntries(required.map(k => [k, true])) as typeof touched
    setTouched(allTouched)
    if (!formValid) { setError('Please fill in all required fields.'); return }
    if (!cart?.id)  { setError('Your cart is empty.'); return }
    if (!selectedMethod) { setError('Please select a payment method.'); return }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/orders', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId:        cart.id,
          firstName:     form.firstName.trim(),
          lastName:      form.lastName.trim(),
          email:         form.email.trim(),
          phone:         form.phone.trim() || null,
          address_line1: form.address_line1.trim(),
          address_line2: form.address_line2.trim() || null,
          city:          form.city.trim(),
          state:         form.state,
          zip:           form.zip.trim(),
          notes:         form.notes.trim() || null,
          paymentMethod: selectedMethod,
          sessionId:     cart.session_id,
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Order failed. Please try again.'); return }

      clearCart()

      // Pass payment instructions for success page
      const method = config?.payment_methods.find(m => m.id === selectedMethod)
      const instructions = method?.type === 'instruction'
        ? interpolateInstructions(method.instructions ?? '', method.detail)
        : null
      if (instructions) sessionStorage.setItem('order_instructions', instructions)

      router.push(`/checkout/success?id=${data.orderId}&total=${data.total}`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <ShoppingBag size={48} style={{ color: 'var(--color-border)' }} />
          <p style={{ color: 'var(--color-text-muted)' }}>Your cart is empty.</p>
          <Link href="/shop" className="cyber-btn">Browse the Shop</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Link href="/shop" className="hover:underline" style={{ color: 'var(--color-text-muted)' }}>Shop</Link>
          <ChevronRight size={14} />
          <Link href="#" onClick={() => router.back()} className="hover:underline" style={{ color: 'var(--color-text-muted)' }}>Cart</Link>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--color-text)' }}>Checkout</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-black mb-8"
          style={{ color: 'var(--color-text)' }}
        >
          Checkout
        </motion.h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 items-start">

            {/* ── Left: Customer Info + Payment ── */}
            <div className="flex flex-col gap-6">

              {/* Contact */}
              <motion.section
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="p-6 rounded-2xl"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--r-blue)' }}
              >
                <h2 className="font-bold text-sm uppercase tracking-widest mb-5" style={{ color: 'var(--r-blue)' }}>
                  Contact Information
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {/* First / Last Name */}
                  {([['firstName','First Name'],['lastName','Last Name']] as [keyof Form,string][]).map(([k,label]) => (
                    <Field key={k} label={label} error={fieldError(k)} required>
                      <input
                        type="text" value={form[k]} onChange={set(k)} onBlur={() => handleBlur(k)}
                        className="cyber-input" placeholder={label}
                      />
                    </Field>
                  ))}
                  {/* Email */}
                  <Field label="Email Address" error={fieldError('email')} required className="col-span-2 sm:col-span-1">
                    <input
                      type="email" value={form.email} onChange={set('email')} onBlur={() => handleBlur('email')}
                      className="cyber-input" placeholder="you@example.com"
                    />
                  </Field>
                  {/* Phone */}
                  <Field label="Phone" error={fieldError('phone')} className="col-span-2 sm:col-span-1">
                    <input
                      type="tel" value={form.phone} onChange={set('phone')}
                      className="cyber-input" placeholder="(555) 555-0123"
                    />
                  </Field>
                </div>
              </motion.section>

              {/* Shipping Address */}
              <motion.section
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="p-6 rounded-2xl"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--r-green)' }}
              >
                <h2 className="font-bold text-sm uppercase tracking-widest mb-5" style={{ color: 'var(--r-green)' }}>
                  Shipping Address
                </h2>
                <div className="flex flex-col gap-4">
                  <Field label="Address Line 1" error={fieldError('address_line1')} required>
                    <input
                      type="text" value={form.address_line1} onChange={set('address_line1')} onBlur={() => handleBlur('address_line1')}
                      className="cyber-input" placeholder="123 Main Street"
                    />
                  </Field>
                  <Field label="Address Line 2 (Apt, Suite, etc.)">
                    <input
                      type="text" value={form.address_line2} onChange={set('address_line2')}
                      className="cyber-input" placeholder="Optional"
                    />
                  </Field>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <Field label="City" error={fieldError('city')} required className="col-span-2 sm:col-span-1">
                      <input
                        type="text" value={form.city} onChange={set('city')} onBlur={() => handleBlur('city')}
                        className="cyber-input" placeholder="City"
                      />
                    </Field>
                    <Field label="State" error={fieldError('state')} required>
                      <select value={form.state} onChange={set('state')} onBlur={() => handleBlur('state')} className="cyber-input appearance-none cursor-pointer">
                        <option value="">—</option>
                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Field>
                    <Field label="ZIP Code" error={fieldError('zip')} required>
                      <input
                        type="text" value={form.zip} onChange={set('zip')} onBlur={() => handleBlur('zip')}
                        className="cyber-input" placeholder="00000" maxLength={10}
                      />
                    </Field>
                  </div>
                  <Field label="Order Notes (optional)">
                    <textarea
                      value={form.notes} onChange={set('notes')}
                      className="cyber-input resize-none" rows={3}
                      placeholder="Special instructions, delivery notes, etc."
                    />
                  </Field>
                </div>
              </motion.section>

              {/* Payment Method */}
              <motion.section
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="p-6 rounded-2xl"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--r-violet)' }}
              >
                <h2 className="font-bold text-sm uppercase tracking-widest mb-5" style={{ color: 'var(--r-violet)' }}>
                  Payment Method
                </h2>

                {loadingConfig ? (
                  <div className="flex items-center gap-2 py-4" style={{ color: 'var(--color-text-muted)' }}>
                    <Loader size={16} className="animate-spin" /> Loading payment options…
                  </div>
                ) : config?.payment_methods.length === 0 ? (
                  <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(212,176,48,0.08)', border: '1px solid rgba(212,176,48,0.2)', color: 'var(--r-yellow)' }}>
                    Payment methods haven&apos;t been configured yet. Please contact the store to arrange payment.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {config?.payment_methods.map(method => {
                      const Icon = METHOD_ICONS[method.icon] ?? Package
                      const active = selectedMethod === method.id
                      return (
                        <label key={method.id} className="cursor-pointer">
                          <input
                            type="radio" name="paymentMethod" value={method.id}
                            checked={active} onChange={() => setSelected(method.id)}
                            className="sr-only"
                          />
                          <div
                            className="p-4 rounded-xl flex items-start gap-3 transition-all duration-200"
                            style={{
                              background:  active ? 'rgba(136,68,216,0.10)' : 'var(--color-bg)',
                              border:      `1.5px solid ${active ? 'var(--r-violet)' : 'var(--color-border)'}`,
                            }}
                          >
                            <div className="p-2 rounded-lg shrink-0 mt-0.5" style={{ background: active ? 'rgba(136,68,216,0.15)' : 'var(--color-surface)' }}>
                              <Icon size={16} style={{ color: active ? 'var(--r-violet)' : 'var(--color-text-muted)' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm" style={{ color: active ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                                  {method.name}
                                </span>
                                {active && <Check size={14} style={{ color: 'var(--r-violet)' }} />}
                              </div>
                              <AnimatePresence>
                                {active && method.type === 'instruction' && method.instructions && (
                                  <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="text-xs mt-2 leading-relaxed"
                                    style={{ color: 'var(--color-text-muted)' }}
                                  >
                                    {interpolateInstructions(method.instructions, method.detail)}
                                  </motion.p>
                                )}
                                {active && method.type === 'stripe' && (
                                  <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}
                                  >
                                    Card payment — you&apos;ll enter card details after placing the order.
                                  </motion.p>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </motion.section>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-start gap-2 p-4 rounded-xl text-sm"
                    style={{ background: 'rgba(224,88,88,0.08)', border: '1px solid rgba(224,88,88,0.2)', color: 'var(--r-red)' }}
                  >
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit — visible below form on mobile */}
              <div className="lg:hidden">
                <SubmitButton submitting={submitting} total={total} />
              </div>
            </div>

            {/* ── Right: Order Summary ── */}
            <motion.aside
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="lg:sticky lg:top-6 flex flex-col gap-4"
            >
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <h2 className="font-bold text-sm uppercase tracking-widest mb-5" style={{ color: 'var(--color-primary)' }}>
                  Order Summary
                </h2>

                {/* Items */}
                <div className="flex flex-col gap-3 mb-5">
                  {cart.items.map((item, i) => (
                    <div key={item.id} className="flex gap-3 items-start">
                      <div
                        className="relative shrink-0 rounded-lg overflow-hidden"
                        style={{ width: 52, height: 52, background: 'var(--color-bg)', borderLeft: `2px solid ${rc(i)}` }}
                      >
                        <Image
                          src={item.image || '/images/placeholder.svg'}
                          alt={item.title} fill className="object-cover" sizes="52px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-snug truncate" style={{ color: 'var(--color-text)' }}>
                          {item.title}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: rc(i) }}>{item.category}</p>
                        {item.quantity > 1 && (
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Qty: {item.quantity}</p>
                        )}
                      </div>
                      <span className="text-sm font-black shrink-0" style={{ color: 'var(--color-text)' }}>
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals breakdown */}
                <div
                  className="flex flex-col gap-2 pt-4"
                  style={{ borderTop: '1px solid var(--color-border)' }}
                >
                  <TotalRow label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
                  <TotalRow
                    label={`Shipping${config?.free_shipping_threshold && subtotal >= config.free_shipping_threshold ? ' (free!)' : ''}`}
                    value={shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}
                    accent={shipping === 0}
                  />
                  {tax > 0 && (
                    <TotalRow
                      label={`Tax (${((config?.tax_rate ?? 0) * 100).toFixed(1)}%)`}
                      value={`$${tax.toFixed(2)}`}
                    />
                  )}
                  <div
                    className="flex justify-between items-center pt-3 mt-1"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                  >
                    <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Total</span>
                    <span className="text-xl font-black" style={{ color: 'var(--color-primary)' }}>
                      ${total.toFixed(2)}
                    </span>
                  </div>

                  {(config?.free_shipping_threshold ?? 0) > 0 && subtotal < (config?.free_shipping_threshold ?? 0) && (
                    <p className="text-xs text-center mt-2" style={{ color: 'var(--color-text-muted)' }}>
                      Add ${((config?.free_shipping_threshold ?? 0) - subtotal).toFixed(2)} more for free shipping
                    </p>
                  )}
                </div>
              </div>

              {/* Submit — desktop */}
              <div className="hidden lg:block">
                <SubmitButton submitting={submitting} total={total} />
              </div>

              <p className="text-xs text-center px-2" style={{ color: 'var(--color-text-muted)' }}>
                By placing your order you agree to our terms. Your cart items are held for 48 hours.
              </p>
            </motion.aside>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function Field({
  label, error, required: req, children, className = '',
}: {
  label: string; error?: string | null; required?: boolean; children: React.ReactNode; className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
        {label}{req && <span className="ml-0.5" style={{ color: 'var(--r-red)' }}>*</span>}
      </label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: 'var(--r-red)' }}>{error}</p>}
    </div>
  )
}

function TotalRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ color: accent ? 'var(--r-green)' : 'var(--color-text)', fontWeight: accent ? 700 : 400 }}>
        {value}
      </span>
    </div>
  )
}

function SubmitButton({ submitting, total }: { submitting: boolean; total: number }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className="cyber-btn w-full justify-center text-base"
      style={{ opacity: submitting ? 0.7 : 1 }}
    >
      {submitting
        ? <><Loader size={16} className="animate-spin" /> Placing Order…</>
        : <><Check size={16} /> Place Order — ${total.toFixed(2)}</>
      }
    </button>
  )
}

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { formatPhone, formatName, formatEmail } from '@/lib/format'

interface Props {
  productId?: string
  productTitle?: string
  onClose?: () => void
}

export default function InquiryForm({ productId, productTitle, onClose }: Props) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, product_id: productId, product_title: productTitle }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      setForm({ name: '', email: '', phone: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 py-8 text-center"
      >
        <CheckCircle size={48} style={{ color: 'var(--color-primary)' }} />
        <div>
          <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Message Sent!</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            I&apos;ll get back to you as soon as possible.
          </p>
        </div>
        {onClose && (
          <button className="cyber-btn text-xs" onClick={onClose}>Close</button>
        )}
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {productTitle && (
        <div
          className="text-xs tracking-widest uppercase px-3 py-2 mb-1"
          style={{
            borderLeft: '2px solid var(--color-accent)',
            background: 'rgba(191,91,74,0.07)',
            color: 'var(--color-accent)',
          }}
        >
          Re: {productTitle}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs tracking-widest uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>
            Name *
          </label>
          <input
            required
            className="cyber-input"
            placeholder="Anastasia Beaverhousin"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: formatName(e.target.value) }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs tracking-widest uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>
            Email *
          </label>
          <input
            required
            type="text"
            className="cyber-input"
            placeholder="you@example.com"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: formatEmail(e.target.value) }))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs tracking-widest uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>
          Phone (optional)
        </label>
        <input
          type="tel"
          className="cyber-input"
          placeholder="(555) 555-0123"
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs tracking-widest uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>
          Message *
        </label>
        <textarea
          required
          rows={4}
          className="cyber-input resize-none"
          placeholder="Ask about availability, shipping, custom orders..."
          value={form.message}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
        />
      </div>

      {status === 'error' && (
        <div
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
          style={{ background: 'rgba(224,88,88,0.1)', color: 'var(--r-red)', border: '1px solid rgba(224,88,88,0.25)' }}
        >
          <AlertCircle size={14} />
          Something went wrong. Please try again.
        </div>
      )}

      <button type="submit" disabled={status === 'sending'} className="cyber-btn self-start">
        {status === 'sending'
          ? <><Loader size={14} className="animate-spin" /> Sending...</>
          : <><Send size={14} /> Send Message</>}
      </button>
    </form>
  )
}

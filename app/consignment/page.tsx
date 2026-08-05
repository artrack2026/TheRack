'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Handshake, DollarSign, Clock, Truck, ShieldCheck, ArrowRight, Loader } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { useConsignmentEnabled } from '@/lib/useConsignmentEnabled'

const DETAILS = [
  {
    icon: DollarSign,
    color: '#3ab870',
    title: 'Fee Split',
    /* Placeholder — no percentage was provided yet. Replace before launch. */
    body: '[Commission percentage to be finalized] of the final sale price goes to Art-R-Ack to cover web hosting, marketing, payment processing, and day-to-day maintenance. The remainder is yours.',
  },
  {
    icon: Clock,
    color: '#3878e0',
    title: 'When You Get Paid',
    /* Placeholder — no timing was provided yet. Replace before launch. */
    body: '[Payment timing to be finalized — e.g. "within 14 days of a confirmed sale"]. Payment details are confirmed with every approved consignor before their first piece goes live.',
  },
  {
    icon: Truck,
    color: '#e07838',
    title: 'Shipping',
    /* Placeholder — responsibility wasn't specified yet. Replace before launch. */
    body: '[Shipping responsibility to be finalized — who packs, who ships, who covers the cost]. This will be spelled out in the consignor agreement before anything is listed.',
  },
]

export default function ConsignmentPage() {
  const { enabled, loading } = useConsignmentEnabled()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size={24} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>
    )
  }

  if (!enabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Handshake size={40} style={{ color: 'var(--color-border)' }} />
        <p className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Consignment isn&apos;t currently open</p>
        <p className="text-sm max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
          Check back later, or reach out through the contact page if you have questions.
        </p>
        <Link href="/contact" className="cyber-btn text-sm">Contact Us</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-32">
      <PageHeader
        eyebrow="Sell With Us"
        title="Consignment"
        accentColor="var(--r-violet)"
        description="Have pieces that fit the Art-R-Ack aesthetic but aren't your own? Consignment lets select artists and collectors sell through the same gallery — curated, not open to everyone."
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-14 p-6 rounded-2xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text)' }}>What Is Consignment?</h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          You retain ownership of your piece until it sells — Art-R-Ack lists it, presents it alongside
          the rest of the gallery, and handles the sale. Once it sells, you&apos;re paid your share and
          Art-R-Ack keeps a percentage to cover the cost of running the storefront. Nothing is bought
          upfront and nothing is owed if a piece doesn&apos;t sell.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-14"
      >
        <h2 className="text-lg font-bold mb-5" style={{ color: 'var(--color-text)' }}>The Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {DETAILS.map(({ icon: Icon, color, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="p-5 rounded-xl"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: `3px solid ${color}` }}
            >
              <Icon size={18} style={{ color }} className="mb-3" />
              <p className="font-bold text-sm mb-1.5" style={{ color: 'var(--color-text)' }}>{title}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{body}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-14 p-6 rounded-2xl"
        style={{ background: 'rgba(136,68,216,0.06)', border: '1px solid rgba(136,68,216,0.2)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={18} style={{ color: 'var(--r-violet)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Enrollment Is By Approval Only</h2>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Not every submission is accepted. Approval is entirely at the discretion of the Art-R-Ack
          owner, based on whether a piece fits the theme of the gallery and doesn&apos;t directly
          compete with the original artwork already being offered. This keeps the collection
          intentional rather than a general marketplace.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>How to Enroll</h2>
        <p className="text-sm max-w-md mx-auto mb-6" style={{ color: 'var(--color-text-muted)' }}>
          The full application — photos, enrollment forms, and required paperwork — is coming soon.
          In the meantime, reach out and tell us about what you&apos;d like to consign.
        </p>
        <Link href="/contact" className="cyber-btn cyber-btn-accent">
          Get in Touch <ArrowRight size={15} />
        </Link>
      </motion.div>
    </div>
  )
}

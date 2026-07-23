'use client'

import { motion } from 'framer-motion'
import { Mail, AtSign, Clock } from 'lucide-react'
import InquiryForm from '@/components/InquiryForm'
import PageHeader from '@/components/PageHeader'

const contactInfo = [
  {
    icon: Mail,
    label: 'Email',
    value: 'hello@artrack.com',
    href: 'mailto:hello@artrack.com',
    color: 'var(--r-orange)',
    tint: 'rgba(224,120,56,0.1)',
  },
  {
    icon: AtSign,
    label: 'Instagram',
    value: '@artrack',
    href: 'https://instagram.com',
    color: 'var(--r-pink)',
    tint: 'rgba(216,68,144,0.1)',
  },
  {
    icon: Clock,
    label: 'Response Time',
    value: 'Within 24 hours',
    href: null,
    color: 'var(--r-violet)',
    tint: 'rgba(136,68,216,0.1)',
  },
]

export default function ContactPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-32">

      <PageHeader
        eyebrow="Get in Touch"
        title="Let's Talk"
        className="mb-14"
        description="Questions about a specific piece? Interested in a custom order? Or just want to say hello? Send a message and I'll get back to you personally."
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

        {/* Form — 3 cols, rose-tinted inputs */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="lg:col-span-3 p-8 input-tint-rose"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
          }}
        >
          <p
            className="text-xs tracking-[0.2em] uppercase font-semibold mb-6"
            style={{ color: 'var(--r-pink)' }}
          >
            Send a Message
          </p>
          <InquiryForm />
        </motion.div>

        {/* Contact info — 2 cols */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.2 }}
          className="lg:col-span-2 flex flex-col gap-4"
        >
          {contactInfo.map(({ icon: Icon, label, value, href, color, tint }) => (
            <div
              key={label}
              className="p-5 flex items-start gap-4"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderLeft: `3px solid ${color}`,
                borderRadius: '0 12px 12px 0',
              }}
            >
              <div
                className="p-2.5 rounded-xl shrink-0"
                style={{ background: tint }}
              >
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <p
                  className="text-xs tracking-widest uppercase font-semibold mb-1"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {label}
                </p>
                {href ? (
                  <a
                    href={href}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="font-medium text-sm transition-colors hover:opacity-80"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {value}
                  </a>
                ) : (
                  <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                    {value}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Personal note — accent-border left panel */}
          <div
            className="p-5 text-sm leading-relaxed rounded-r-xl"
            style={{
              borderLeft: '3px solid var(--r-yellow)',
              background: 'rgba(212,176,48,0.06)',
              color: 'var(--color-text-muted)',
            }}
          >
            Every message is read personally. Whether it&apos;s a quick question or a detailed custom request — you&apos;ll hear from me directly.
          </div>
        </motion.div>
      </div>
    </div>
  )
}

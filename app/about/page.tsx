'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Zap, Heart, Globe } from 'lucide-react'

const values = [
  {
    icon: Zap,
    title: 'Bold & Unapologetic',
    desc: 'Every piece in the collection stands out. We curate for impact, not trend.',
    color: '#d4b030',
    tint: 'rgba(212,176,48,0.1)',
  },
  {
    icon: Heart,
    title: 'Every Item Has a Story',
    desc: 'Whether it was painted yesterday or salvaged from a 1920s factory, the history matters.',
    color: '#e05858',
    tint: 'rgba(224,88,88,0.1)',
  },
  {
    icon: Globe,
    title: 'Ships Anywhere',
    desc: 'Carefully packaged and shipped with precision. Your piece arrives the way it left — perfect.',
    color: '#3ab870',
    tint: 'rgba(58,184,112,0.1)',
  },
]

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-32">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="mb-20"
      >
        <p
          className="text-xs tracking-[0.3em] uppercase font-semibold mb-4"
          style={{ color: 'var(--r-cyan)' }}
        >
          Our Story
        </p>
        <h1 className="text-5xl md:text-6xl font-black leading-tight mb-4" style={{ color: 'var(--color-text)' }}>
          What is<br />
          <span className="rainbow-text">Art-R-Ack?</span>
        </h1>
        {/* Sharp underline accent */}
        <div className="h-1 w-14 mb-10" style={{ background: 'var(--r-cyan)', borderRadius: '0' }} />

        <div className="max-w-2xl">
          <p className="text-lg leading-relaxed mb-5" style={{ color: 'var(--color-text-muted)' }}>
            ArtRAck started with a simple belief: the most interesting things in the world are usually the ones that don&apos;t fit neatly into a box. Original artwork that challenges, reclaimed materials given new life, and goods selected with purpose.
          </p>
          <p className="text-lg leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            This is a curated collection — not a mass marketplace. Every item is chosen or created by hand. When you buy from ArtRAck, you&apos;re getting something that exists nowhere else.
          </p>
        </div>
      </motion.div>

      {/* Values */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
        className="mb-20"
      >
        <h2 className="text-2xl font-black mb-8" style={{ color: 'var(--color-text)' }}>
          What We Stand For
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {values.map(({ icon: Icon, title, desc, color, tint }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="p-6"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '14px',
              }}
            >
              {/* Icon with colored rounded container */}
              <div
                className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4"
                style={{ background: tint }}
              >
                <Icon size={22} style={{ color }} />
              </div>
              <h3 className="font-bold text-base mb-2" style={{ color: 'var(--color-text)' }}>
                {title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                {desc}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Shipping info */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
        className="p-8 mb-20 relative overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
        }}
      >
        {/* Rainbow top bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{
            background: 'linear-gradient(90deg, #e07838, #d4b030, #3ab870)',
            borderRadius: '16px 16px 0 0',
          }}
        />
        <h2 className="text-xl font-black mb-5" style={{ color: 'var(--color-text)' }}>
          Shipping &amp; Packaging
        </h2>
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <div
            className="pl-4"
            style={{ borderLeft: '3px solid #e07838' }}
          >
            <p className="font-bold mb-2" style={{ color: '#e07838' }}>
              Artwork &amp; Large Items
            </p>
            <p>
              Wrapped in glassine, padded with acid-free materials, and boxed with corner protection. Fragile items ship with double-wall boxes.
            </p>
          </div>
          <div
            className="pl-4"
            style={{ borderLeft: '3px solid #3ab870' }}
          >
            <p className="font-bold mb-2" style={{ color: '#3ab870' }}>
              Small Goods
            </p>
            <p>
              Packed in custom rigid mailers or small boxes with tissue paper. All orders include a handwritten note and tracking.
            </p>
          </div>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
        className="text-center"
      >
        <p className="text-lg mb-6" style={{ color: 'var(--color-text-muted)' }}>
          Ready to find something special?
        </p>
        <Link href="/shop" className="cyber-btn">
          Browse the Shop <ArrowRight size={15} />
        </Link>
      </motion.div>
    </div>
  )
}

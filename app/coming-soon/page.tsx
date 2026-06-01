'use client'

import { motion } from 'framer-motion'
import LogoText from '@/components/LogoText'

export default function ComingSoonPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative overflow-hidden"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Subtle background bloom */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 30% 40%, rgba(224,120,56,0.06) 0%, transparent 65%),
            radial-gradient(ellipse 50% 50% at 70% 60%, rgba(136,68,216,0.06) 0%, transparent 65%)
          `,
        }}
      />

      {/* Rainbow stripe at top */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: 'linear-gradient(90deg,#e05858,#e07838,#d4b030,#3ab870,#1ab4c0,#3878e0,#8844d8,#d84490)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative z-10 max-w-lg"
      >
        {/* Caution tape decoration */}
        <motion.div
          initial={{ opacity: 0, rotate: -3 }}
          animate={{ opacity: 1, rotate: -2 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8 inline-flex items-center gap-3 px-5 py-2 text-xs font-bold tracking-widest uppercase"
          style={{
            background: '#d4b030',
            color: '#1c1c1a',
            borderRadius: '2px',
            transform: 'rotate(-2deg)',
          }}
        >
          ✦ Pardon Our Sawdust ✦
        </motion.div>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-6"
        >
          <LogoText className="text-5xl md:text-7xl" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-2xl md:text-3xl font-black mb-4"
          style={{ color: 'var(--color-text)' }}
        >
          The Showroom Is Getting Its Walls Painted
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-base leading-relaxed mb-3"
          style={{ color: 'var(--color-text-muted)' }}
        >
          The artist is busy turning blank canvases into something worth hanging.
          We'll be back soon — and it'll be worth the wait.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          In the meantime, feel free to reach out at{' '}
          <a
            href="mailto:hello@artrack.com"
            className="underline hover:opacity-80 transition-opacity"
            style={{ color: 'var(--color-primary)' }}
          >
            hello@artrack.com
          </a>
        </motion.p>

        {/* Animated paint brush */}
        <motion.div
          animate={{ rotate: ['-8deg', '8deg', '-8deg'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="text-5xl mt-10 inline-block"
          style={{ transformOrigin: 'bottom center' }}
        >
          🎨
        </motion.div>

        {/* Rainbow dots */}
        <div className="flex justify-center gap-2 mt-8">
          {['#e05858','#e07838','#d4b030','#3ab870','#1ab4c0','#3878e0','#8844d8','#d84490'].map((c, i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
              style={{ width: 8, height: 8, borderRadius: '50%', background: c }}
            />
          ))}
        </div>
      </motion.div>

      {/* Rainbow stripe at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{
          background: 'linear-gradient(90deg,#d84490,#8844d8,#3878e0,#1ab4c0,#3ab870,#d4b030,#e07838,#e05858)',
        }}
      />
    </div>
  )
}

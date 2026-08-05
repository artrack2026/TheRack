'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Handshake, PackageSearch, Loader } from 'lucide-react'
import ReversedRWordmark from '@/components/ReversedRWordmark'
import { useConsignmentEnabled } from '@/lib/useConsignmentEnabled'

export default function CustomeRCurationsPage() {
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
        <p className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>This collection isn&apos;t currently available</p>
        <Link href="/shop" className="cyber-btn text-sm"><ArrowLeft size={14} /> Back to Shop</Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-32">
      <Link
        href="/shop"
        className="inline-flex items-center gap-2 text-xs tracking-widest uppercase mb-10 transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <ArrowLeft size={12} /> Back to Shop
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="text-center mb-16"
      >
        <p className="text-xs tracking-[0.3em] uppercase font-semibold mb-4" style={{ color: 'var(--r-violet)' }}>
          Consigned Pieces
        </p>
        <h1 className="mb-4">
          <ReversedRWordmark before="Custome-" after="-Curations" className="text-5xl md:text-6xl" />
        </h1>
        <div className="h-1 w-14 mx-auto mb-6" style={{ background: 'var(--r-violet)', borderRadius: 0 }} />
        <p className="max-w-xl mx-auto text-base leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Pieces selected from outside artists and collectors, curated to fit the Art-R-Ack gallery
          alongside original work — sold on consignment, approved one at a time.
        </p>
      </motion.div>

      {/* No consignor product/listing system exists yet — this is the page's
          resting state until that's built. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col items-center gap-4 py-24 text-center"
      >
        <PackageSearch size={40} style={{ color: 'var(--color-border)' }} />
        <p className="font-bold" style={{ color: 'var(--color-text)' }}>No consigned pieces yet</p>
        <p className="text-sm max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
          This collection fills up as consignors are approved and list their pieces. Check back soon.
        </p>
        <Link href="/consignment" className="cyber-btn cyber-btn-accent text-sm mt-2">
          Learn About Consignment <ArrowRight size={14} />
        </Link>
      </motion.div>
    </div>
  )
}

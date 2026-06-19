'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Package, Recycle, Palette } from 'lucide-react'
import ParticleField from '@/components/ParticleField'
import LogoText from '@/components/LogoText'
import SpinningRack from '@/components/SpinningRack'
import { useEffect, useState } from 'react'
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase'
import { Product } from '@/lib/types'

const categories = [
  {
    id: 'artwork',
    label: 'Artwork',
    icon: Palette,
    desc: 'Original paintings, prints, and mixed-media pieces',
    color: '#e05858',
    tint: 'rgba(224,88,88,0.08)',
  },
  {
    id: 'reclaimed',
    label: 'Reclaimed',
    icon: Recycle,
    desc: 'Upcycled furniture, salvaged materials, found objects',
    color: '#3ab870',
    tint: 'rgba(58,184,112,0.08)',
  },
  {
    id: 'goods',
    label: 'Goods',
    icon: Package,
    desc: 'Hand-selected small goods, accessories, and collectibles',
    color: '#8844d8',
    tint: 'rgba(136,68,216,0.08)',
  },
]

const demoFeatured: Product[] = [
  { id: 'demo-1', title: 'Warm Dissolution No. 3', description: 'Large-format abstract in terracotta, ochre, and burnt sienna on raw linen.', price: 875, category: 'artwork', images: ['/images/warm-dissolution.svg'], stock_count: 1, featured: true, dimensions: '36" × 48"', materials: 'Oil + cold wax on raw linen', created_at: new Date().toISOString() },
  { id: 'demo-2', title: 'Reclaimed Factory Window Frame', description: '1940s textile mill steel frame with original industrial paint layers.', price: 340, category: 'reclaimed', images: ['/images/factory-window.svg'], stock_count: 1, featured: true, dimensions: '42" × 60"', materials: 'Salvaged steel', created_at: new Date().toISOString() },
  { id: 'demo-3', title: 'Botanical Press Prints — Set of 3', description: 'Original pressed botanicals sealed in archival resin on watercolor paper.', price: 120, category: 'goods', images: ['/images/botanical-prints.svg'], stock_count: 3, featured: true, dimensions: '8" × 10" each', materials: 'Pressed botanicals, archival resin', created_at: new Date().toISOString() },
  { id: 'demo-4', title: 'Portraits of No One — Study IV', description: 'Charcoal and graphite portrait study on toned paper.', price: 290, category: 'artwork', images: ['/images/portraits-study.svg'], stock_count: 1, featured: true, dimensions: '18" × 24"', materials: 'Charcoal, graphite', created_at: new Date().toISOString() },
  { id: 'demo-7', title: 'Color Study — Spectrum Grid', description: 'A meditative 6×6 grid painting in a single session. Signed, unframed.', price: 480, category: 'artwork', images: ['/images/spectrum-grid.svg'], stock_count: 1, featured: true, dimensions: '24" × 24"', materials: 'Acrylic on birch panel', created_at: new Date().toISOString() },
]

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([])

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured) {
        /* Use demo items so the rack shows even without Supabase */
        setFeatured(demoFeatured)
        return
      }
      const supabase = getSupabaseClient()
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('featured', true)
        .order('created_at', { ascending: false })
        .limit(6)
      setFeatured(data && data.length > 0 ? data : demoFeatured)
    }
    load()
  }, [])

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <ParticleField />

        {/* Warm radial bloom behind logo */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 70% 55% at 50% 50%,
                rgba(200,144,42,0.06) 0%, transparent 65%)
            `,
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          {/* Pre-title eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center gap-3 mb-8"
          >
            <span className="w-10 h-px" style={{ background: 'var(--color-accent)' }} />
            <span
              className="text-xs tracking-[0.3em] uppercase font-semibold"
              style={{ color: 'var(--color-accent)' }}
            >
              Curated Collections
            </span>
            <span className="w-10 h-px" style={{ background: 'var(--color-accent)' }} />
          </motion.div>

          {/* Logo */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-6xl md:text-8xl tracking-tight leading-none mb-6"
          >
            <LogoText className="text-6xl md:text-8xl" />
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Where bold art meets reclaimed beauty. Each piece tells a story — find yours.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.38 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <Link href="/shop" className="cyber-btn">
              Explore Shop
            </Link>
            <Link href="/contact" className="cyber-btn cyber-btn-accent">
              Get In Touch <ArrowRight size={15} />
            </Link>
          </motion.div>

        </div>

        {/* Scroll hint — anchored to the section, not the inner container */}
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        >
          <div
            className="w-5 h-8 border-2 rounded-full flex items-start justify-center pt-1.5"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div
              className="w-1 h-2 rounded-full"
              style={{ background: 'var(--color-accent)' }}
            />
          </div>
        </motion.div>
      </section>

      {/* ── Spinning Rack ── */}
      {featured.length >= 2 && (
        <section
          className="py-24 overflow-hidden"
          style={{ background: 'var(--color-surface)' }}
        >
          <div className="max-w-7xl mx-auto px-4">
            <SpinningRack products={featured} />
          </div>
        </section>
      )}

      {/* ── Categories ── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="text-center mb-14"
        >
          <p
            className="text-xs tracking-[0.3em] uppercase font-semibold mb-3"
            style={{ color: 'var(--r-yellow)' }}
          >
            Collections
          </p>
          <h2 className="text-4xl font-black" style={{ color: 'var(--color-text)' }}>
            Browse by Category
          </h2>
          <div
            className="heading-underline mx-auto mt-3"
            style={{ background: 'var(--r-yellow)' }}
          />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {categories.map(({ id, label, icon: Icon, desc, color, tint }, i) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.09 }}
            >
              <Link href={`/shop?category=${id}`} className="block group h-full">
                <div
                  className="h-full p-7 transition-all duration-300 relative overflow-hidden"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderLeft: `3px solid ${color}`,
                    borderRadius: '0 14px 14px 0',   /* sharp left, rounded right — whimsical contrast */
                  }}
                >
                  {/* Hover tint fill */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                    style={{ background: tint }}
                  />

                  {/* Icon container — rounded square, colored tint */}
                  <div
                    className="inline-flex items-center justify-center w-12 h-12 mb-5 float-anim rounded-xl"
                    style={{ background: tint }}
                  >
                    <Icon size={24} style={{ color }} />
                  </div>

                  <h3
                    className="text-lg font-black mb-2 relative"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {label}
                  </h3>
                  <p
                    className="text-sm leading-relaxed mb-5 relative"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {desc}
                  </p>
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase relative"
                    style={{ color }}
                  >
                    Browse{' '}
                    <ArrowRight
                      size={12}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="relative overflow-hidden p-12 md:p-16 text-center"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '20px',
          }}
        >
          {/* Rainbow color bar across the top — sharp horizontal accent */}
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{
              background: 'linear-gradient(90deg, #e05858, #e07838, #d4b030, #3ab870, #1ab4c0, #3878e0, #8844d8, #d84490)',
              borderRadius: '20px 20px 0 0',
            }}
          />

          <div
            className="absolute inset-0 pointer-events-none rounded-[20px]"
            style={{
              background: 'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(191,91,74,0.07) 0%, transparent 70%)',
            }}
          />

          <p
            className="text-xs tracking-[0.3em] uppercase font-semibold mb-3 relative"
            style={{ color: 'var(--color-accent)' }}
          >
            Have Questions?
          </p>
          <h2
            className="text-3xl md:text-4xl font-black mb-4 relative"
            style={{ color: 'var(--color-text)' }}
          >
            Custom Orders Welcome
          </h2>
          <p
            className="max-w-xl mx-auto mb-8 text-base leading-relaxed relative"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Looking for something specific? Curious about a piece? Reach out — every item has a story worth sharing.
          </p>
          <Link href="/contact" className="cyber-btn cyber-btn-accent relative">
            Start a Conversation <ArrowRight size={15} />
          </Link>
        </motion.div>
      </section>
    </div>
  )
}

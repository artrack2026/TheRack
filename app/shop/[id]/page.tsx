'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, Package, Ruler, Weight, MessageSquare } from 'lucide-react'
import InquiryForm from '@/components/InquiryForm'
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase'
import { Product } from '@/lib/types'

const demoProducts: Record<string, Product> = {
  'demo-1': {
    id: 'demo-1', title: 'Neon Dreamscape #7',
    description: 'A vibrant abstract acrylic painting exploring the tension between digital and organic forms. Each brushstroke is intentional — this piece rewards extended viewing, with new details revealing themselves over time.\n\nThe layered technique creates depth that photographs struggle to capture fully. In person, the textural variation and the way light plays across the surface make this a truly immersive experience.',
    price: 450, category: 'artwork', images: ['/images/placeholder.svg'], stock_count: 1,
    featured: true, dimensions: '24" × 36"', materials: 'Acrylic on canvas', weight_oz: 32,
    created_at: new Date().toISOString(),
  },
  'demo-2': {
    id: 'demo-2', title: 'Salvaged Oak Shelf',
    description: 'Hand-crafted floating shelf made from 100-year-old reclaimed barn oak with live edges. Each shelf is unique — the grain pattern, character marks, and natural edge profile are one of a kind.\n\nComes with all mounting hardware. Supports up to 50lbs when properly mounted into studs.',
    price: 280, category: 'reclaimed', images: ['/images/placeholder.svg'], stock_count: 2,
    featured: true, dimensions: '48" × 10"', materials: 'Reclaimed oak, steel brackets', weight_oz: 120,
    created_at: new Date().toISOString(),
  },
  'demo-3': {
    id: 'demo-3', title: 'Cosmic Print Series — Mars',
    description: 'Limited edition risograph print from the Cosmic Series. Deep maroon and metallic gold layers printed on heavy stock.\n\nEdition of 50. Each print is hand-numbered and signed. Ships flat in a protective sleeve.',
    price: 85, category: 'goods', images: ['/images/placeholder.svg'], stock_count: 5,
    featured: false, dimensions: '11" × 14"', materials: 'Risograph on 100# stock', weight_oz: 4,
    created_at: new Date().toISOString(),
  },
  'demo-4': {
    id: 'demo-4', title: 'Industrial Pipe Lamp',
    description: 'One-of-a-kind table lamp crafted from repurposed iron pipe fittings. The raw industrial aesthetic pairs beautifully with the warm glow of the included Edison bulb.\n\nHardwired with a fabric-wrapped cord and inline switch. Requires standard E26 bulb (included).',
    price: 195, category: 'reclaimed', images: ['/images/placeholder.svg'], stock_count: 1,
    featured: false, dimensions: '18" H', materials: 'Galvanized iron, vintage wiring', weight_oz: 80,
    created_at: new Date().toISOString(),
  },
  'demo-5': {
    id: 'demo-5', title: 'Abstract Faces II',
    description: 'Bold oil painting of fragmented faces in vivid blues and warm ochres. Part of an ongoing series exploring identity and fragmentation in the digital age.\n\nThe work is unframed and ready to hang or frame to your taste. Oil on linen provides exceptional longevity.',
    price: 620, category: 'artwork', images: ['/images/placeholder.svg'], stock_count: 1,
    featured: true, dimensions: '30" × 40"', materials: 'Oil on linen', weight_oz: 48,
    created_at: new Date().toISOString(),
  },
  'demo-6': {
    id: 'demo-6', title: 'Enamel Pin Set — City Grid',
    description: 'Set of 4 hard enamel pins inspired by aerial city grid patterns. Gold metal finish with rubber clutch backs.\n\nComes packaged on a custom backing card. Great gift for urban design lovers.',
    price: 35, category: 'goods', images: ['/images/placeholder.svg'], stock_count: 12,
    featured: false, dimensions: '1" each', materials: 'Hard enamel, gold plating', weight_oz: 2,
    created_at: new Date().toISOString(),
  },
}

const categoryColors: Record<string, string> = {
  artwork: 'var(--color-accent)',
  reclaimed: 'var(--color-accent)',
  goods: '#a855f7',
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState(0)
  const [showInquiry, setShowInquiry] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (id.startsWith('demo-')) {
        setProduct(demoProducts[id] || null)
        setLoading(false)
        return
      }
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }
      const supabase = getSupabaseClient()
      const { data } = await supabase.from('products').select('*').eq('id', id).single()
      setProduct(data)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--color-accent)' }} />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Product not found</p>
        <Link href="/shop" className="cyber-btn text-sm"><ArrowLeft size={14} /> Back to Shop</Link>
      </div>
    )
  }

  const catColor = categoryColors[product.category] || 'var(--color-accent)'

  return (
    <div className="max-w-7xl mx-auto px-6 py-32">
      {/* Breadcrumb */}
      <div
        className="flex items-center gap-2 text-xs tracking-widest uppercase mb-12"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <Link href="/shop" className="hover:underline transition-colors" style={{ color: 'var(--color-text-muted)' }}>
          Shop
        </Link>
        <ChevronRight size={12} />
        <Link
          href={`/shop?category=${product.category}`}
          className="capitalize hover:underline transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {product.category}
        </Link>
        <ChevronRight size={12} />
        <span className="normal-case truncate max-w-[16rem]" style={{ color: 'var(--color-text)' }}>
          {product.title}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Images */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div
            className="relative aspect-square mb-4 overflow-hidden"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <Image
              src={product.images[activeImage] || '/images/placeholder.svg'}
              alt={product.title}
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
            {product.stock_count === 0 && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'rgba(10,10,15,0.7)' }}
              >
                <span
                  className="text-xl font-black tracking-widest uppercase"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Sold
                </span>
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-3">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className="relative w-16 h-16 overflow-hidden transition-all"
                  style={{
                    border: `2px solid ${i === activeImage ? catColor : 'var(--color-border)'}`,
                    background: 'var(--color-surface)',
                  }}
                >
                  <Image src={img} alt="" fill unoptimized className="object-cover" sizes="64px" />
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Details */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-col gap-6"
        >
          <div>
            <span
              className="category-badge text-xs mb-3 inline-block"
              style={{ color: catColor, borderColor: catColor }}
            >
              {product.category}
            </span>
            <h1
              className="text-3xl md:text-4xl font-black leading-tight"
              style={{ color: 'var(--color-text)' }}
            >
              {product.title}
            </h1>
            {product.sku && (
              <p className="text-xs mt-1.5 tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                Item #{product.sku}
              </p>
            )}
          </div>

          <div className="flex items-baseline gap-3">
            <span
              className="text-4xl font-black"
              style={{ color: 'var(--color-accent)' }}
            >
              ${product.price.toFixed(2)}
            </span>
            {product.stock_count > 0 ? (
              <span className="text-xs tracking-widest uppercase px-2 py-1" style={{ color: '#22c55e', border: '1px solid #22c55e22', background: '#22c55e11' }}>
                {product.stock_count === 1 ? 'Last one' : `${product.stock_count} available`}
              </span>
            ) : (
              <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
                Sold Out
              </span>
            )}
          </div>

          {/* Description */}
          <div
            className="pt-4 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {(product.description ?? '').split('\n\n').map((para, i) => (
              <p
                key={i}
                className="text-sm leading-relaxed mb-3"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {para}
              </p>
            ))}
          </div>

          {/* Specs */}
          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            {product.dimensions && (
              <div className="flex items-center gap-2">
                <Ruler size={14} style={{ color: catColor }} />
                <div>
                  <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Size</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{product.dimensions}</p>
                </div>
              </div>
            )}
            {product.materials && (
              <div className="flex items-center gap-2">
                <Package size={14} style={{ color: catColor }} />
                <div>
                  <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Materials</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{product.materials}</p>
                </div>
              </div>
            )}
            {product.weight_oz && (
              <div className="flex items-center gap-2">
                <Weight size={14} style={{ color: catColor }} />
                <div>
                  <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Weight</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{product.weight_oz} oz</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => setShowInquiry(!showInquiry)}
              className="cyber-btn cyber-btn-accent flex-1"
            >
              <MessageSquare size={16} />
              {showInquiry ? 'Hide Form' : 'Ask About This Item'}
            </button>
          </div>

          {/* Inline inquiry form */}
          {showInquiry && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35 }}
              className="overflow-hidden pt-2 border-t"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <p
                className="text-xs tracking-[0.2em] uppercase mb-4"
                style={{ color: 'var(--color-accent)' }}
              >
                Send an Inquiry
              </p>
              <InquiryForm
                productId={product.id}
                productTitle={product.title}
                onClose={() => setShowInquiry(false)}
              />
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

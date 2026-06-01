'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { MessageSquare, Eye, ShoppingBag, Check } from 'lucide-react'
import { useState } from 'react'
import { Product } from '@/lib/types'
import { useCart } from '@/components/CartProvider'

const categoryColors: Record<string, string> = {
  artwork:   '#e05858',
  reclaimed: '#3ab870',
  goods:     '#8844d8',
}

const categoryTints: Record<string, string> = {
  artwork:   'rgba(224,88,88,0.12)',
  reclaimed: 'rgba(58,184,112,0.12)',
  goods:     'rgba(136,68,216,0.12)',
}

interface Props {
  product: Product
  index?: number
}

export default function ProductCard({ product, index = 0 }: Props) {
  const catColor = categoryColors[product.category] || '#c8902a'
  const catTint  = categoryTints[product.category]  || 'rgba(200,144,42,0.1)'
  const imageSrc = product.images?.[0] || '/images/placeholder.svg'
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (product.stock_count === 0 || added) return
    await addItem({
      id:       product.id,
      title:    product.title,
      category: product.category,
      price:    product.price,
      image:    imageSrc,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
    >
      <Link href={`/shop/${product.id}`} className="block group">
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderLeft: `3px solid ${catColor}`,
            borderRadius: '14px',
            overflow: 'hidden',
            transition: 'box-shadow 0.25s ease, transform 0.25s ease',
          }}
          className="group-hover:-translate-y-1 group-hover:shadow-2xl"
        >
          {/* Image */}
          <div
            className="relative overflow-hidden"
            style={{ height: '216px', background: 'var(--color-bg)', borderRadius: '11px 11px 0 0' }}
          >
            {imageSrc.endsWith('.svg') ? (
              <img
                src={imageSrc}
                alt={product.title}
                className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <Image
                src={imageSrc}
                alt={product.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            )}

            {/* Hover overlay */}
            <div
              className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'rgba(20,20,18,0.72)' }}
            >
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide uppercase"
                style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
              >
                <Eye size={13} /> View
              </span>
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide uppercase"
                style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}
              >
                <MessageSquare size={13} /> Inquire
              </span>
            </div>

            {/* Featured badge — sharp, intentional contrast */}
            {product.featured && (
              <div
                className="absolute top-0 left-0 art-label"
                style={{ background: '#d4b030', color: '#1c1c1a', borderRadius: '0 0 6px 0', padding: '3px 8px' }}
              >
                ★ Featured
              </div>
            )}

            {/* Sold overlay */}
            {product.stock_count === 0 && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(20,20,18,0.82)' }}>
                <span
                  className="text-xs font-bold tracking-widest uppercase px-3 py-1"
                  style={{ border: '1px solid var(--color-text-muted)', color: 'var(--color-text-muted)', borderRadius: '99px' }}
                >
                  Sold
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-bold text-sm leading-snug" style={{ color: 'var(--color-text)' }}>
                {product.title}
              </h3>
              <span
                className="shrink-0 category-badge text-xs"
                style={{ color: catColor, borderColor: catColor, background: catTint }}
              >
                {product.category}
              </span>
            </div>

            <p className="text-xs leading-relaxed line-clamp-2 mb-3" style={{ color: 'var(--color-text-muted)' }}>
              {product.description}
            </p>

            <div className="flex items-center justify-between gap-2">
              {/* Price — sharp label */}
              <span
                className="art-label text-sm font-black"
                style={{ background: catTint, color: catColor, padding: '0.2rem 0.5rem', borderRadius: '2px' }}
              >
                ${product.price.toFixed(2)}
              </span>

              <div className="flex items-center gap-2">
                {product.dimensions && (
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {product.dimensions}
                  </span>
                )}

                {/* Add to Cart button */}
                {product.stock_count > 0 && (
                  <button
                    onClick={handleAddToCart}
                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all duration-200"
                    style={{
                      background: added ? 'rgba(58,184,112,0.15)' : catTint,
                      color:      added ? '#3ab870' : catColor,
                      border:     `1px solid ${added ? '#3ab870' : catColor}40`,
                    }}
                    aria-label="Add to cart"
                  >
                    {added ? <Check size={12} /> : <ShoppingBag size={12} />}
                    {added ? 'Added' : 'Cart'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bottom color fill on hover */}
          <div
            className="h-0.5 w-0 group-hover:w-full transition-all duration-500"
            style={{ background: `linear-gradient(90deg, ${catColor}, transparent)`, borderRadius: '0 0 14px 14px' }}
          />
        </div>
      </Link>
    </motion.div>
  )
}

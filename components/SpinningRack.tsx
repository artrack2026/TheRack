'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import ProductCard from './ProductCard'
import { Product } from '@/lib/types'

/* Rainbow pop colors — same set used in ProductCard / page colors */
const RAINBOW = [
  '#e05858',
  '#e07838',
  '#d4b030',
  '#3ab870',
  '#1ab4c0',
  '#3878e0',
  '#8844d8',
  '#d84490',
]

function color(i: number) { return RAINBOW[i % RAINBOW.length] }

interface Props { products: Product[] }

export default function SpinningRack({ products }: Props) {
  const n = products.length
  const [activeIndex, setActiveIndex] = useState(0)
  const [isAutoPlay, setIsAutoPlay]   = useState(true)
  const [isDragging, setIsDragging]   = useState(false)
  const dragStartX = useRef(0)

  /* Radius of the cylinder — scales with n */
  const cardRadius = Math.max(320, (n * 310) / (2 * Math.PI))
  const rotation   = -activeIndex * (360 / n)

  const goTo = useCallback(
    (idx: number) => setActiveIndex(((idx % n) + n) % n),
    [n],
  )
  const next = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo])
  const prev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo])

  /* Auto-spin */
  useEffect(() => {
    if (!isAutoPlay || isDragging) return
    const t = setInterval(next, 3800)
    return () => clearInterval(t)
  }, [isAutoPlay, isDragging, next])

  /* Drag handlers */
  const onDragStart = (x: number) => { setIsDragging(true); dragStartX.current = x }
  const onDragMove  = (x: number) => {
    if (!isDragging) return
    const delta = x - dragStartX.current
    if (Math.abs(delta) > 80) {
      delta > 0 ? prev() : next()
      dragStartX.current = x
    }
  }
  const onDragEnd = () => setIsDragging(false)

  /* Per-item depth for opacity */
  const depthOf = (i: number) => {
    const offset = ((i - activeIndex) % n + n) % n
    return Math.cos((offset / n) * 2 * Math.PI)
  }

  if (n === 0) return null

  return (
    <div
      className="relative select-none"
      onMouseEnter={() => setIsAutoPlay(false)}
      onMouseLeave={() => { setIsAutoPlay(true); onDragEnd() }}
    >
      {/* ── Section header ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
        className="text-center mb-12"
      >
        <p
          className="text-xs tracking-[0.3em] uppercase font-semibold mb-3"
          style={{ color: 'var(--color-accent)' }}
        >
          On the Rack This Week
        </p>
        <h2 className="text-4xl font-black" style={{ color: 'var(--color-text)' }}>
          Featured Pieces
        </h2>
        <div
          className="heading-underline mx-auto mt-3"
          style={{ background: 'var(--color-accent)' }}
        />
        <p className="text-sm mt-3" style={{ color: 'var(--color-text-muted)' }}>
          Drag to spin &bull; tap any card to bring it forward
        </p>
      </motion.div>

      {/* ── Rack Rod ── */}
      <div className="relative mx-auto px-10" style={{ maxWidth: '820px' }}>
        {/* Ceiling mount stub */}
        <div className="flex justify-center mb-1">
          <div
            style={{
              width: '6px',
              height: '20px',
              background: 'linear-gradient(180deg, #555 0%, #999 100%)',
              borderRadius: '3px',
            }}
          />
        </div>

        {/* The rod — warm metallic bar */}
        <div className="rack-rod-bar">
          {products.map((_, i) => {
            const pct = ((i + 0.5) / n) * 100
            const isActive = i === activeIndex
            const c = color(i)
            return (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Select item ${i + 1}`}
                style={{
                  position: 'absolute',
                  left: `${pct}%`,
                  top: '100%',
                  transform: 'translateX(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: 0,
                  zIndex: 10,
                }}
              >
                {/* Wire */}
                <div
                  style={{
                    width: isActive ? '2px' : '1.5px',
                    height: isActive ? '34px' : '26px',
                    background: isActive ? c : '#555',
                    transition: 'all 0.4s ease',
                  }}
                />
                {/* Dot */}
                <div
                  style={{
                    width: isActive ? '11px' : '6px',
                    height: isActive ? '11px' : '6px',
                    borderRadius: '50%',
                    background: c,
                    opacity: isActive ? 1 : 0.35,
                    transition: 'all 0.4s ease',
                    animation: isActive ? 'hook-pulse 1.8s ease-in-out infinite' : 'none',
                  }}
                />
              </button>
            )
          })}
        </div>
      </div>

      {/* Gap between hooks and carousel */}
      <div style={{ height: '68px' }} />

      {/* ── 3D Carousel ── */}
      <div
        className="relative cursor-grab active:cursor-grabbing"
        style={{ height: '460px', perspective: '1400px' }}
        onMouseDown={e => onDragStart(e.clientX)}
        onMouseMove={e => onDragMove(e.clientX)}
        onMouseUp={onDragEnd}
        onTouchStart={e => onDragStart(e.touches[0].clientX)}
        onTouchMove={e => onDragMove(e.touches[0].clientX)}
        onTouchEnd={onDragEnd}
      >
        {/* Rotating hub */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 0,
            height: 0,
            transformStyle: 'preserve-3d',
            transform: `rotateY(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.72s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {products.map((product, i) => {
            const itemAngle = (i / n) * 360
            const depth     = depthOf(i)
            const isActive  = i === activeIndex
            const c         = color(i)
            const opacity   = Math.max(0.18, 0.22 + 0.78 * ((depth + 1) / 2))

            return (
              <div
                key={product.id}
                style={{
                  position: 'absolute',
                  top: '-210px',
                  left: '-140px',
                  width: '280px',
                  transform: `rotateY(${itemAngle}deg) translateZ(${cardRadius}px)`,
                  opacity,
                  transition: 'opacity 0.4s ease',
                }}
              >
                {/* Sway for front card */}
                <div
                  style={{
                    animation: isActive
                      ? `sway ${3.2 + (i % 3) * 0.5}s ease-in-out infinite`
                      : 'none',
                    animationDelay: `${i * 0.35}s`,
                    transformOrigin: 'top center',
                  }}
                >
                  {/* Colored outline ring — rounded, soft */}
                  <div
                    style={{
                      borderRadius: '16px',
                      outline: isActive ? `2px solid ${c}` : '2px solid transparent',
                      outlineOffset: '3px',
                      transition: 'outline 0.4s ease, box-shadow 0.4s ease',
                      boxShadow: isActive
                        ? `0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px ${c}33`
                        : '0 6px 24px rgba(0,0,0,0.4)',
                    }}
                  >
                    <ProductCard product={product} index={i} />
                  </div>

                  {/* Click interceptor for non-active cards */}
                  {!isActive && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        cursor: 'pointer',
                        zIndex: 20,
                        borderRadius: '16px',
                      }}
                      onClick={() => goTo(i)}
                    />
                  )}
                </div>

                {/* Color label under active card */}
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mt-3"
                  >
                    <span
                      className="text-xs tracking-widest uppercase font-bold"
                      style={{ color: c }}
                    >
                      ★ Featured
                    </span>
                  </motion.div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Navigation ── */}
      <div className="flex items-center justify-center gap-5 mt-4">
        <button
          onClick={prev}
          aria-label="Previous"
          className="p-2.5 transition-all hover:scale-105"
          style={{
            borderRadius: '50%',
            background: 'var(--color-surface)',
            border: `1.5px solid ${color((activeIndex - 1 + n) % n)}`,
            color: color((activeIndex - 1 + n) % n),
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={18} />
        </button>

        {/* Pill indicators */}
        <div className="flex items-center gap-2">
          {products.map((_, i) => {
            const c = color(i)
            const isActive = i === activeIndex
            return (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to item ${i + 1}`}
                style={{
                  width: isActive ? '28px' : '8px',
                  height: '8px',
                  borderRadius: '99px',
                  background: isActive ? c : '#444',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.35s ease',
                  padding: 0,
                }}
              />
            )
          })}
        </div>

        <button
          onClick={next}
          aria-label="Next"
          className="p-2.5 transition-all hover:scale-105"
          style={{
            borderRadius: '50%',
            background: 'var(--color-surface)',
            border: `1.5px solid ${color((activeIndex + 1) % n)}`,
            color: color((activeIndex + 1) % n),
            cursor: 'pointer',
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Auto-spin toggle */}
      <div className="flex justify-center mt-3">
        <button
          onClick={() => setIsAutoPlay(a => !a)}
          className="flex items-center gap-1.5 text-xs tracking-widest uppercase font-medium px-3 py-1 rounded-full transition-all"
          style={{
            color: isAutoPlay ? 'var(--color-accent)' : 'var(--color-text-muted)',
            background: isAutoPlay ? 'rgba(200,144,42,0.1)' : 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <RotateCcw
            size={10}
            style={{ animation: isAutoPlay ? 'spin 2.5s linear infinite' : 'none' }}
          />
          {isAutoPlay ? 'Auto-spinning' : 'Auto-spin off'}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

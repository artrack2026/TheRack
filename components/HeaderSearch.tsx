'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader, X } from 'lucide-react'
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase'
import { Product } from '@/lib/types'

interface Props {
  className?: string
  /** Called after a navigation is triggered — e.g. to close the mobile menu. */
  onNavigate?: () => void
  /** Renders as an icon button that expands into the input on click,
   *  instead of always showing the input field. */
  collapsible?: boolean
}

const DEBOUNCE_MS = 300
const MIN_CHARS = 2
const MAX_RESULTS = 6

/** Strips characters that have special meaning in PostgREST's .or() filter
 *  syntax (`,()`) or as ILIKE wildcards (`%_`) — without this, a search term
 *  containing them could reshape the query rather than just fail to match. */
function sanitizeSearchTerm(raw: string): string {
  return raw.replace(/[,()%_]/g, ' ').trim().slice(0, 80)
}

export default function HeaderSearch({ className = '', onNavigate, collapsible = false }: Props) {
  const router = useRouter()
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<Product[]>([])
  const [loading, setLoading]   = useState(false)
  const [open, setOpen]         = useState(false)
  const [expanded, setExpanded] = useState(!collapsible)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const term = sanitizeSearchTerm(query)
    if (term.length < MIN_CHARS || !isSupabaseConfigured) {
      setResults([])
      return
    }

    setLoading(true)
    const timeout = setTimeout(async () => {
      try {
        const { data } = await getSupabaseClient()
          .from('products')
          .select('id, title, description, price, images, category, stock_count, featured, dimensions, materials, weight_oz, sku, created_at')
          .or(`title.ilike.%${term}%,description.ilike.%${term}%,sku.ilike.%${term}%`)
          .limit(MAX_RESULTS)
        setResults((data as Product[]) ?? [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    // mousedown (not click) — a click on the collapsible toggle button swaps
    // its icon (Search -> X), which unmounts the clicked node before a
    // same-tick 'click' listener on document would run, making every toggle
    // click look like an outside click. mousedown fires before that re-render.
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        if (collapsible) {
          setExpanded(false)
          setQuery('')
          setResults([])
        }
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [collapsible])

  const collapse = () => {
    if (!collapsible) return
    setExpanded(false)
    setQuery('')
    setResults([])
  }

  const goToResults = () => {
    const term = query.trim()
    if (!term) return
    setOpen(false)
    collapse()
    onNavigate?.()
    router.push(`/shop?q=${encodeURIComponent(term)}`)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    goToResults()
  }

  const goToProduct = (id: string) => {
    setOpen(false)
    collapse()
    onNavigate?.()
    router.push(`/shop/${id}`)
  }

  const dropdown = open && sanitizeSearchTerm(query).length >= MIN_CHARS && (
    <div
      className="absolute left-0 right-0 mt-2 overflow-hidden"
      style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.45)', zIndex: 100,
      }}
    >
      {loading ? (
        <div className="flex items-center gap-2 px-4 py-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader size={14} className="animate-spin" /> Searching…
        </div>
      ) : results.length === 0 ? (
        <p className="px-4 py-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          No pieces found for &quot;{query}&quot;
        </p>
      ) : (
        <>
          {results.map(product => (
            <button
              key={product.id}
              onClick={() => goToProduct(product.id)}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors hover:bg-white/5"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <div className="relative shrink-0 rounded-lg overflow-hidden" style={{ width: 40, height: 40, background: 'var(--color-bg)' }}>
                {product.images?.[0] && (
                  <Image src={product.images[0]} alt="" fill className="object-cover" sizes="40px" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{product.title}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>${product.price.toFixed(2)}</p>
              </div>
            </button>
          ))}
          <Link
            href={`/shop?q=${encodeURIComponent(query.trim())}`}
            onClick={() => { setOpen(false); collapse(); onNavigate?.() }}
            className="block px-4 py-2.5 text-xs font-semibold tracking-widest uppercase transition-colors hover:bg-white/5"
            style={{ color: 'var(--color-accent)', borderTop: '1px solid var(--color-border)' }}
          >
            See all results for &quot;{query.trim()}&quot;
          </Link>
        </>
      )}
    </div>
  )

  if (!collapsible) {
    return (
      <div className={`relative ${className}`} ref={wrapperRef}>
        <form onSubmit={handleSubmit} className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            type="search"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="Search pieces..."
            className="cyber-input w-full text-sm"
            style={{ paddingLeft: '2rem', paddingRight: query ? '2rem' : undefined }}
            aria-label="Search products"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]) }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </form>
        {dropdown}
      </div>
    )
  }

  return (
    <div className={`relative flex items-center justify-end ${className}`} ref={wrapperRef}>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'min(60vw, 240px)', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative"
          >
            <div className="overflow-hidden">
              <form onSubmit={handleSubmit} className="relative">
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setOpen(true) }}
                  onFocus={() => setOpen(true)}
                  placeholder="Search pieces..."
                  className="cyber-input w-full text-sm"
                  style={{ paddingRight: query ? '2rem' : undefined }}
                  aria-label="Search products"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => { setQuery(''); setResults([]) }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </form>
            </div>
            {dropdown}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => {
          if (expanded) {
            collapse()
          } else {
            setExpanded(true)
            requestAnimationFrame(() => inputRef.current?.focus())
          }
        }}
        className="p-2 rounded-full hover:bg-white/5 transition-colors shrink-0"
        style={{ color: 'var(--color-text-muted)' }}
        aria-label={expanded ? 'Close search' : 'Search'}
      >
        {expanded ? <X size={18} /> : <Search size={18} />}
      </button>
    </div>
  )
}

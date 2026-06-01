'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Search, SlidersHorizontal } from 'lucide-react'
import ProductCard from '@/components/ProductCard'
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase'
import { Product, ProductCategory } from '@/lib/types'

const CATEGORIES: { value: ProductCategory | 'all'; label: string }[] = [
  { value: 'all',       label: 'All' },
  { value: 'artwork',   label: 'Artwork' },
  { value: 'reclaimed', label: 'Reclaimed' },
  { value: 'goods',     label: 'Goods' },
]

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest First' },
  { value: 'price_asc',  label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
]

/* Category accent colors — match ProductCard */
const CAT_COLOR: Record<string, string> = {
  all:       'var(--color-primary)',
  artwork:   '#e05858',
  reclaimed: '#3ab870',
  goods:     '#8844d8',
}

function ShopContent() {
  const searchParams  = useSearchParams()
  const router        = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [sort, setSort]         = useState('newest')

  const activeCategory = (searchParams.get('category') || 'all') as ProductCategory | 'all'

  const setCategory = (cat: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (cat === 'all') params.delete('category')
    else params.set('category', cat)
    router.push(`/shop?${params.toString()}`)
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      if (!isSupabaseConfigured) {
        setProducts(demoProducts)
        setLoading(false)
        return
      }
      const supabase = getSupabaseClient()
      let query = supabase.from('products').select('*')
      if (activeCategory !== 'all') query = query.eq('category', activeCategory)
      if (sort === 'newest')      query = query.order('created_at', { ascending: false })
      else if (sort === 'price_asc') query = query.order('price', { ascending: true })
      else                           query = query.order('price', { ascending: false })
      const { data } = await query
      setProducts(data || [])
      setLoading(false)
    }
    load()
  }, [activeCategory, sort])

  const filtered = products.filter(p =>
    search === '' ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto px-6 py-32">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="mb-12"
      >
        <p
          className="text-xs tracking-[0.3em] uppercase font-semibold mb-2"
          style={{ color: 'var(--r-blue)' }}
        >
          Browse
        </p>
        <h1 className="text-5xl font-black mb-3" style={{ color: 'var(--color-text)' }}>
          The Shop
        </h1>
        {/* Sharp accent underline — contrasting element */}
        <div className="h-1 w-14" style={{ background: 'var(--r-blue)', borderRadius: '0' }} />
      </motion.div>

      {/* Filter row — search gets blue tint */}
      <div className="flex flex-col md:flex-row gap-3 mb-8">

        {/* Search — blue tinted input */}
        <div className="relative flex-1 input-tint-blue">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            className="cyber-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Category pills */}
        <div className="flex gap-2 items-center flex-wrap">
          {CATEGORIES.map(({ value, label }) => {
            const isActive = activeCategory === value
            const c = CAT_COLOR[value]
            return (
              <button
                key={value}
                onClick={() => setCategory(value)}
                className="text-xs font-semibold tracking-widest uppercase px-4 py-2 transition-all duration-200"
                style={{
                  borderRadius: '99px',
                  background: isActive ? c : 'var(--color-surface)',
                  color: isActive ? '#fff' : 'var(--color-text-muted)',
                  border: `1.5px solid ${isActive ? c : 'var(--color-border)'}`,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Sort — violet tinted */}
        <div className="relative input-tint-violet">
          <SlidersHorizontal
            size={13}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="cyber-input appearance-none cursor-pointer shrink-0"
            style={{ paddingLeft: '2.5rem' }}
            style={{ minWidth: '190px' }}
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value} style={{ background: 'var(--color-surface)' }}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs tracking-widest uppercase mb-6" style={{ color: 'var(--color-text-muted)' }}>
        {loading ? 'Loading...' : `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`}
      </p>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse"
              style={{ background: 'var(--color-surface)', borderRadius: '14px', border: '1px solid var(--color-border)' }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-24"
        >
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            No items found
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Try adjusting your search or filter.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ShopPage() {
  return (
    <Suspense>
      <ShopContent />
    </Suspense>
  )
}

const demoProducts: Product[] = [
  {
    id: 'demo-1',
    title: 'Warm Dissolution No. 3',
    description: 'A large-format abstract in terracotta, ochre, and burnt sienna — referencing aerial landscape photography. Edges remain raw linen.',
    price: 875,
    category: 'artwork',
    images: ['/images/warm-dissolution.svg'],
    stock_count: 1,
    featured: true,
    dimensions: '36" × 48"',
    materials: 'Oil + cold wax on raw linen',
    weight_oz: 52,
    created_at: new Date(Date.now() - 1000).toISOString(),
  },
  {
    id: 'demo-2',
    title: 'Reclaimed Factory Window Frame',
    description: 'Pulled from a 1940s textile mill in east Texas. Multi-pane steel frame with original industrial paint layers. Stunning as a room divider or art piece.',
    price: 340,
    category: 'reclaimed',
    images: ['/images/factory-window.svg'],
    stock_count: 1,
    featured: true,
    dimensions: '42" × 60"',
    materials: 'Salvaged steel, original glass panes',
    weight_oz: 480,
    created_at: new Date(Date.now() - 2000).toISOString(),
  },
  {
    id: 'demo-3',
    title: 'Botanical Press Prints — Set of 3',
    description: 'Original pressed botanicals sealed in archival resin on 140lb watercolor paper. Each set is one-of-a-kind. Unframed, ships flat.',
    price: 120,
    category: 'goods',
    images: ['/images/botanical-prints.svg'],
    stock_count: 3,
    featured: true,
    dimensions: '8" × 10" each',
    materials: 'Pressed botanicals, archival resin, watercolor paper',
    weight_oz: 10,
    created_at: new Date(Date.now() - 3000).toISOString(),
  },
  {
    id: 'demo-4',
    title: 'Portraits of No One — Study IV',
    description: 'Charcoal and graphite portrait study on toned paper. Expressive marks, deliberate smudging, haunting depth.',
    price: 290,
    category: 'artwork',
    images: ['/images/portraits-study.svg'],
    stock_count: 1,
    featured: true,
    dimensions: '18" × 24"',
    materials: 'Charcoal, graphite on toned paper',
    weight_oz: 14,
    created_at: new Date(Date.now() - 4000).toISOString(),
  },
  {
    id: 'demo-5',
    title: 'Salvaged Oak + Iron Coat Rack',
    description: 'Five-hook coat rack built from barn oak planks and hand-forged iron hooks. Each hook shaped differently by hand — no two alike.',
    price: 215,
    category: 'reclaimed',
    images: ['/images/coat-rack.svg'],
    stock_count: 2,
    featured: false,
    dimensions: '36" W × 10" D × 6" H',
    materials: 'Barn oak, hand-forged iron',
    weight_oz: 140,
    created_at: new Date(Date.now() - 5000).toISOString(),
  },
  {
    id: 'demo-6',
    title: 'Copper + Linen Herb Planters — Pair',
    description: 'Hand-rolled copper sleeves fitted around raw linen pots. Patina develops naturally over time. Perfect on a windowsill or shelf.',
    price: 68,
    category: 'goods',
    images: ['/images/copper-planters.svg'],
    stock_count: 6,
    featured: false,
    dimensions: '4" dia × 5" H each',
    materials: 'Spun copper, raw linen, drainage gravel',
    weight_oz: 22,
    created_at: new Date(Date.now() - 6000).toISOString(),
  },
  {
    id: 'demo-7',
    title: 'Color Study — Spectrum Grid',
    description: 'A meditative 6×6 grid painting — each cell a different hue applied with palette knife in a single session. Signed, unframed.',
    price: 480,
    category: 'artwork',
    images: ['/images/spectrum-grid.svg'],
    stock_count: 1,
    featured: true,
    dimensions: '24" × 24"',
    materials: 'Acrylic on cradled birch panel',
    weight_oz: 36,
    created_at: new Date(Date.now() - 7000).toISOString(),
  },
]

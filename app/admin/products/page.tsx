'use client'

import { useEffect, useState, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, Star, X, Loader, Save } from 'lucide-react'
import Image from 'next/image'
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase'
import { Product, ProductCategory } from '@/lib/types'

const EMPTY: Omit<Product, 'id' | 'created_at'> = {
  title: '', description: '', price: 0, category: 'artwork',
  images: [], stock_count: 1, featured: false, dimensions: '', materials: '',
}

const CAT_COLOR: Record<string, string> = { artwork: '#e05858', reclaimed: '#3ab870', goods: '#8844d8' }

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState<Partial<Product> | null>(null)
  const [saving, setSaving]     = useState(false)

  const load = async () => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    const { data } = await getSupabaseClient().from('products').select('*').order('created_at', { ascending: false })
    setProducts((data as Product[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNew  = () => setEditing({ ...EMPTY })
  const openEdit = (p: Product) => setEditing({ ...p })
  const close    = () => setEditing(null)

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing || !isSupabaseConfigured) return
    setSaving(true)
    const supabase = getSupabaseClient()

    if (editing.id) {
      const { id, created_at, ...rest } = editing as Product
      await supabase.from('products').update(rest).eq('id', id)
    } else {
      await supabase.from('products').insert([editing as Product])
    }

    await load()
    setSaving(false)
    close()
  }

  const toggleFeatured = async (p: Product) => {
    if (!isSupabaseConfigured) return
    await getSupabaseClient().from('products').update({ featured: !p.featured }).eq('id', p.id)
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, featured: !x.featured } : x))
  }

  const deleteProduct = async (id: string) => {
    if (!isSupabaseConfigured || !confirm('Delete this product?')) return
    await getSupabaseClient().from('products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase font-semibold mb-1" style={{ color: 'var(--r-red)' }}>Admin</p>
          <h2 className="text-3xl font-black mb-1" style={{ color: 'var(--color-text)' }}>Products</h2>
          <div className="h-1 w-10" style={{ background: 'var(--r-red)', borderRadius: 0 }} />
        </div>
        <button onClick={openNew} className="cyber-btn btn--red text-sm">
          <Plus size={14} /> Add Product
        </button>
      </motion.div>

      {/* Edit / Create modal */}
      <AnimatePresence>
        {editing !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={e => { if (e.target === e.currentTarget) close() }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-xl overflow-y-auto"
              style={{ maxHeight: '90vh', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '18px' }}
            >
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <p className="font-bold" style={{ color: 'var(--color-text)' }}>{editing.id ? 'Edit Product' : 'New Product'}</p>
                <button onClick={close} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
              </div>

              <form onSubmit={handleSave} className="p-6 flex flex-col gap-4 input-tint-rose">
                {[
                  ['title', 'Title *', 'Product title', 'text'],
                  ['price', 'Price *', '0.00', 'number'],
                  ['stock_count', 'Stock Count', '1', 'number'],
                  ['dimensions', 'Dimensions', '12" × 16"', 'text'],
                  ['materials', 'Materials', 'Oil on canvas', 'text'],
                ].map(([key, label, placeholder, type]) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
                    <input required={key === 'title' || key === 'price'} type={type}
                      step={key === 'price' ? '0.01' : undefined}
                      className="cyber-input" placeholder={placeholder}
                      value={(editing as Record<string, unknown>)[key] as string ?? ''}
                      onChange={e => setEditing(prev => ({ ...prev, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))} />
                  </div>
                ))}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Category *</label>
                  <select required className="cyber-input appearance-none cursor-pointer" value={editing.category ?? 'artwork'}
                    onChange={e => setEditing(prev => ({ ...prev, category: e.target.value as ProductCategory }))}
                    style={{ background: 'var(--color-surface)' }}>
                    <option value="artwork">Artwork</option>
                    <option value="reclaimed">Reclaimed</option>
                    <option value="goods">Goods</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Description</label>
                  <textarea rows={3} className="cyber-input resize-none" placeholder="Describe this piece…"
                    value={editing.description ?? ''}
                    onChange={e => setEditing(prev => ({ ...prev, description: e.target.value }))} />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={editing.featured ?? false}
                    onChange={e => setEditing(prev => ({ ...prev, featured: e.target.checked }))} />
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Mark as Featured (shows on rack)</span>
                </label>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="cyber-btn">
                    {saving ? <><Loader size={13} className="animate-spin" /> Saving…</> : <><Save size={13} /> Save Product</>}
                  </button>
                  <button type="button" onClick={close} className="cyber-btn art-btn-ghost">Cancel</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {products.map((product, i) => {
            const c = CAT_COLOR[product.category] ?? '#ccc'
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                className="flex items-center gap-4 p-4"
                style={{
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderLeft: `3px solid ${c}`, borderRadius: '0 12px 12px 0',
                }}
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0" style={{ background: 'var(--color-bg)' }}>
                  {product.images?.[0] ? (
                    <Image src={product.images[0]} alt={product.title} width={48} height={48} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">🎨</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: 'var(--color-text)' }}>
                    {product.title}
                    {product.featured && <Star size={11} className="inline ml-1.5" style={{ color: '#d4b030' }} fill="#d4b030" />}
                  </p>
                  <p className="text-xs" style={{ color: c }}>{product.category} · ${product.price.toFixed(2)} · {product.stock_count} in stock</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => toggleFeatured(product)} title={product.featured ? 'Unfeature' : 'Feature'}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    style={{ color: product.featured ? '#d4b030' : 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Star size={15} fill={product.featured ? '#d4b030' : 'none'} />
                  </button>
                  <button onClick={() => openEdit(product)}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => deleteProduct(product.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                    style={{ color: 'var(--r-red)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

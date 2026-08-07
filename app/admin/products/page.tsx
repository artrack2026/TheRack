'use client'

import { useEffect, useState, FormEvent, ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, Star, X, Loader, Save, ImagePlus, AlertCircle, Search } from 'lucide-react'
import Image from 'next/image'
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase'
import { Product, ProductCategory } from '@/lib/types'
import { compressImage } from '@/lib/image-compress'
import PageHeader from '@/components/PageHeader'

const EMPTY: Omit<Product, 'id' | 'created_at'> = {
  title: '', description: '', price: 0, category: 'artwork',
  images: [], stock_count: 1, featured: false, dimensions: '', materials: '', sku: '',
}

const CAT_COLOR: Record<string, string> = { artwork: '#e05858', reclaimed: '#3ab870', goods: '#8844d8' }

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState<Partial<Product> | null>(null)
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [loadError, setLoadError]     = useState<string | null>(null)
  const [saveError, setSaveError]     = useState<string | null>(null)
  const [search, setSearch]           = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | ProductCategory>('all')

  const filteredProducts = products.filter(p => {
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return p.title.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q)
  })

  const load = async () => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    setLoadError(null)
    const { data, error } = await getSupabaseClient().from('products').select('*').order('created_at', { ascending: false })
    if (error) setLoadError(error.message)
    setProducts((data as Product[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNew  = () => { setEditing({ ...EMPTY }); setSaveError(null); setUploadError(null) }
  const openEdit = (p: Product) => { setEditing({ ...p }); setSaveError(null); setUploadError(null) }
  const close    = () => setEditing(null)

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing || !isSupabaseConfigured) return
    setSaving(true)
    setSaveError(null)
    const supabase = getSupabaseClient()

    try {
      if (editing.id) {
        const { id, created_at, ...rest } = editing as Product
        const { error } = await supabase.from('products').update(rest).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('products').insert([editing as Product])
        if (error) throw error
      }

      await load()
      close()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // allow re-selecting the same file again later
    if (files.length === 0) return

    setUploading(true)
    setUploadError(null)
    try {
      for (const file of files) {
        const { blob, contentType } = await compressImage(file)

        const presignRes = await fetch('/api/admin/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name.replace(/\.[^.]+$/, '.webp'), contentType }),
        })
        if (!presignRes.ok) throw new Error((await presignRes.json()).error ?? 'Could not get upload URL')
        const { uploadUrl, publicUrl } = await presignRes.json()

        const putRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: blob })
        if (!putRes.ok) throw new Error('Upload to S3 failed')

        setEditing(prev => prev ? { ...prev, images: [...(prev.images ?? []), publicUrl] } : prev)
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const removeImage = async (url: string) => {
    setEditing(prev => prev ? { ...prev, images: (prev.images ?? []).filter(i => i !== url) } : prev)
    try {
      await fetch('/api/admin/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
    } catch {
      // best-effort cleanup — the image is already detached from the product either way
    }
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
      <PageHeader
        eyebrow="Admin"
        title="Products"
        size="md"
        accentColor="var(--r-violet)"
        actions={
          <button onClick={openNew} className="cyber-btn btn--violet text-sm">
            <Plus size={14} /> Add Product
          </button>
        }
      />

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
                  ['sku', 'Product ID', 'e.g. ART-042', 'text'],
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
                    {key === 'sku' && (
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Optional. Shown on the product page and searchable from the header search.
                      </p>
                    )}
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

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
                    Product Images
                  </label>

                  {(editing.images?.length ?? 0) > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {editing.images!.map(url => (
                        <div
                          key={url}
                          className="relative aspect-square rounded-lg overflow-hidden"
                          style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                        >
                          <Image src={url} alt="" fill unoptimized className="object-cover" sizes="80px" />
                          <button
                            type="button"
                            onClick={() => removeImage(url)}
                            aria-label="Remove image"
                            className="absolute top-1 right-1 p-1 rounded-full"
                            style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer' }}
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="cyber-btn art-btn-ghost btn--sm self-start cursor-pointer">
                    {uploading
                      ? <><Loader size={13} className="animate-spin" /> Uploading…</>
                      : <><ImagePlus size={13} /> Add Images</>}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      hidden
                      disabled={uploading}
                      onChange={handleImageUpload}
                    />
                  </label>

                  {uploadError && <p className="text-xs" style={{ color: 'var(--r-red)' }}>{uploadError}</p>}
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={editing.featured ?? false}
                    onChange={e => setEditing(prev => ({ ...prev, featured: e.target.checked }))} />
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Mark as Featured (shows on rack)</span>
                </label>

                {saveError && (
                  <div className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg" style={{ background: 'rgba(224,88,88,0.1)', color: 'var(--r-red)', border: '1px solid rgba(224,88,88,0.25)' }}>
                    <AlertCircle size={14} /> {saveError}
                  </div>
                )}

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

      {loadError && (
        <div
          className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg mb-4"
          style={{ background: 'rgba(224,88,88,0.1)', color: 'var(--r-red)', border: '1px solid rgba(224,88,88,0.25)' }}
        >
          <AlertCircle size={14} /> Couldn&apos;t load products: {loadError}
        </div>
      )}

      {/* Search + category filter */}
      {!loading && products.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                className="cyber-input w-full"
                style={{ paddingLeft: '2.5rem', paddingRight: search ? '2.5rem' : undefined }}
                placeholder="Search by title or product ID…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              {([['all', 'All'], ['artwork', 'Artwork'], ['reclaimed', 'Reclaimed'], ['goods', 'Goods']] as const).map(([key, label]) => {
                const active = categoryFilter === key
                const color  = key === 'all' ? 'var(--color-accent)' : CAT_COLOR[key]
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategoryFilter(key)}
                    className="px-3 py-2 text-xs font-semibold tracking-wide rounded-lg transition-colors shrink-0"
                    style={{
                      background: active ? 'var(--color-surface-2)' : 'transparent',
                      color:      active ? color : 'var(--color-text-muted)',
                      border:     `1px solid ${active ? color : 'var(--color-border)'}`,
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {(search || categoryFilter !== 'all') && (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {filteredProducts.length} of {products.length} products
            </p>
          )}
        </div>
      )}

      {/* Product list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : filteredProducts.length === 0 && !loadError ? (
        <div className="text-center py-20" style={{ color: 'var(--color-text-muted)' }}>
          <p>{products.length === 0 ? 'No products yet.' : 'No products match your search.'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredProducts.map((product, i) => {
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
                    <Image src={product.images[0]} alt={product.title} width={48} height={48} unoptimized className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">🎨</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: 'var(--color-text)' }}>
                    {product.title}
                    {product.featured && <Star size={11} className="inline ml-1.5" style={{ color: '#d4b030' }} fill="#d4b030" />}
                  </p>
                  <p className="text-xs" style={{ color: c }}>
                    {product.category} · ${product.price.toFixed(2)} · {product.stock_count} in stock
                    {product.sku && <span style={{ color: 'var(--color-text-muted)' }}> · {product.sku}</span>}
                  </p>
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

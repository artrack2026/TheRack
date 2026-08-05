'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  RefreshCcw, Settings, Info, Save, AlertCircle,
  Plus, Trash2, GripVertical, ToggleLeft, ToggleRight, DollarSign, Truck, CreditCard,
  Palette, Eye, EyeOff, RotateCcw, Check, MessageSquareMore, Package, ClipboardList,
  ShieldCheck, Search, Key, Loader,
} from 'lucide-react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { SiStripe, SiSquare } from 'react-icons/si'
import { PaymentMethod, ThemeColors } from '@/lib/types'
import { useTheme } from '@/components/ThemeProvider'
import PageHeader from '@/components/PageHeader'
import ToggleSwitch from '@/components/ToggleSwitch'
import TextbeltInfoModal, { TextbeltTopic } from '@/components/TextbeltInfoModal'
import PaymentIconPicker from '@/components/PaymentIconPicker'

/* ── Types ── */

interface TextbeltStatus {
  success: boolean
  remaining: number | null
  initialPurchased: number | null
  apiKey: string | null
  message: string | null
}

interface ShowroomSettings {
  products_per_row: number
  rows_per_page: number
  inquiry_email: string
  instagram?: string | null
  facebook?: string | null
  x?: string | null
  tiktok?: string | null
  snapchat?: string | null
  youtube?: string | null
  linkedin?: string | null
  threads?: string | null
  bluesky?: string | null
  mastodon?: string | null
  tax_rate: number
  shipping_fee: number
  free_shipping_threshold: number
  payment_methods: PaymentMethod[]
  two_factor_enabled: boolean
}

const DEFAULT: ShowroomSettings = {
  products_per_row: 4, rows_per_page: 2, inquiry_email: '',
  instagram: null, facebook: null, x: null, tiktok: null, snapchat: null,
  youtube: null, linkedin: null, threads: null, bluesky: null, mastodon: null,
  tax_rate: 0, shipping_fee: 0, free_shipping_threshold: 0, payment_methods: [],
  two_factor_enabled: false,
}

function newPaymentMethod(order: number): PaymentMethod {
  return {
    id: crypto.randomUUID(),
    name: '',
    enabled: true,
    type: 'instruction',
    icon: 'card',
    detail: '',
    instructions: '',
    sort_order: order,
  }
}

/* ── Remaining-credits status color: green > 100, yellow 50-99, red < 50 ── */
function creditsBlockStyle(remaining: number | null): React.CSSProperties {
  if (remaining === null) {
    return { background: 'var(--color-bg)', border: '1px solid var(--color-border)' }
  }
  if (remaining > 100) {
    return { background: 'rgba(58,184,112,0.08)', border: '1px solid rgba(58,184,112,0.14)' }
  }
  if (remaining >= 50) {
    return { background: 'rgba(212,176,48,0.08)', border: '1px solid rgba(212,176,48,0.14)' }
  }
  return { background: 'rgba(224,88,88,0.08)', border: '1px solid rgba(224,88,88,0.14)' }
}

/* ── Branding data ── */

const COLOR_FIELDS: { key: keyof ThemeColors; label: string; desc: string }[] = [
  { key: 'background', label: 'Background', desc: 'Main page background' },
  { key: 'surface', label: 'Surface', desc: 'Cards and panels' },
  { key: 'primary', label: 'Primary', desc: 'Buttons, links, accents' },
  { key: 'accent', label: 'Accent', desc: 'Secondary highlights' },
  { key: 'text', label: 'Text', desc: 'Primary body text' },
  { key: 'textMuted', label: 'Muted Text', desc: 'Subtitles and labels' },
  { key: 'border', label: 'Border', desc: 'Dividers and card borders' },
]

const PRESETS: { name: string; colors: ThemeColors }[] = [
  {
    name: 'Electric Dark',
    colors: {
      background: '#0a0a0f', surface: '#12121a', primary: '#00f5ff',
      accent: '#ff00aa', text: '#e0e0ff', textMuted: '#7070aa', border: '#1e1e30',
    },
  },
  {
    name: 'Gold Rush',
    colors: {
      background: '#080810', surface: '#10101a', primary: '#ffd700',
      accent: '#ff6b00', text: '#f0f0f0', textMuted: '#888890', border: '#1a1a28',
    },
  },
  {
    name: 'Deep Purple',
    colors: {
      background: '#0d0520', surface: '#150830', primary: '#00e5cc',
      accent: '#a855f7', text: '#f8f0ff', textMuted: '#8868aa', border: '#221040',
    },
  },
  {
    name: 'Midnight Green',
    colors: {
      background: '#050f0a', surface: '#0a1a10', primary: '#00ff88',
      accent: '#00ccff', text: '#e0ffe8', textMuted: '#508060', border: '#0f2018',
    },
  },
  {
    name: 'Crimson Dark',
    colors: {
      background: '#0f0505', surface: '#180a0a', primary: '#ff4444',
      accent: '#ff8800', text: '#ffe8e0', textMuted: '#885040', border: '#201010',
    },
  },
  {
    name: 'Sunset Coral',
    colors: {
      background: '#140a08', surface: '#1e1210', primary: '#ff6f5e',
      accent: '#ffb347', text: '#fff0ea', textMuted: '#9a7268', border: '#2a1815',
    },
  },
  {
    name: 'Arctic Cyan',
    colors: {
      background: '#08121a', surface: '#0e1c26', primary: '#4fd8ff',
      accent: '#7af0c0', text: '#eafcff', textMuted: '#5d8a98', border: '#16303c',
    },
  },
  {
    name: 'Rose Quartz',
    colors: {
      background: '#160a12', surface: '#22101c', primary: '#ff6fc6',
      accent: '#c084fc', text: '#fde8f6', textMuted: '#9a6688', border: '#2c1828',
    },
  },
  {
    name: 'Cyber Lime',
    colors: {
      background: '#0a0f08', surface: '#121a0e', primary: '#c6ff3a',
      accent: '#00e0a0', text: '#f0ffe0', textMuted: '#7a9060', border: '#1c2814',
    },
  },
  {
    name: 'Charcoal Sky',
    colors: {
      background: '#0c0c10', surface: '#15151c', primary: '#6c8cff',
      accent: '#ffd166', text: '#eef0fa', textMuted: '#787890', border: '#1f1f2a',
    },
  },
]

function isActivePreset(preset: ThemeColors, current: ThemeColors): boolean {
  return (Object.keys(preset) as (keyof ThemeColors)[]).every(
    k => preset[k].toLowerCase() === current[k]?.toLowerCase()
  )
}

/* ── Tabs ── */

type TabKey = 'branding' | 'messaging' | 'products' | 'orders' | 'vendors'

const TABS: { key: TabKey; label: string; icon: typeof Palette }[] = [
  { key: 'branding',  label: 'Branding',   icon: Palette },
  { key: 'messaging', label: 'Messaging',  icon: MessageSquareMore },
  { key: 'products',  label: 'Products',   icon: Package },
  { key: 'orders',    label: 'Orders',     icon: ClipboardList },
  { key: 'vendors',   label: 'CC Vendors', icon: CreditCard },
]

/* ── CC Vendors ──
   Credentials are encrypted server-side (lib/vendor-credentials.ts) and
   stored in Supabase — this list is just the UI catalog of which vendors
   have a slot, not the credentials themselves. */
const VENDORS: {
  vendor: string
  credentialKey: string
  label: string
  credentialLabel: string
  Icon: React.ElementType
  color: string
}[] = [
  { vendor: 'stripe', credentialKey: 'secret_key',   label: 'Stripe', credentialLabel: 'Secret Key',    Icon: SiStripe, color: '#635BFF' },
  { vendor: 'square', credentialKey: 'access_token', label: 'Square', credentialLabel: 'Access Token',  Icon: SiSquare, color: '#3E4348' },
]

/* ── Main Component ── */

export default function ShowroomSettingsPage() {
  const { colors, setColors, resetColors } = useTheme()
  const [brandSaved, setBrandSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('branding')

  const [textbeltStatus, setTextbeltStatus] = useState<TextbeltStatus>({
    success: false, remaining: null, initialPurchased: null, apiKey: null,
    message: 'Loading showroom settings…',
  })
  const [settings, setSettings] = useState<ShowroomSettings>(DEFAULT)
  const [form, setForm]         = useState<ShowroomSettings>(DEFAULT)
  const [textbeltModal, setTextbeltModal] = useState<TextbeltTopic | null>(null)
  const [loadingTextbelt, setLoadingTextbelt] = useState(true)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  /* Unsaved-changes guard — only the main form (Messaging/Products/Orders/CC
     Vendors) is tracked. Branding colors save instantly on every pick
     (useTheme's setColors writes to localStorage immediately), so there's
     never an "unsaved" branding state to warn about. */
  const hasUnsavedChanges = JSON.stringify(form) !== JSON.stringify(settings)

  /* ── CC Vendors ── */
  const [vendorStatus, setVendorStatus] = useState<Record<string, { configured: boolean; lastFour: string | null; updatedAt: string | null }>>({})
  const [vendorInputs, setVendorInputs] = useState<Record<string, string>>({})
  const [vendorShow, setVendorShow]     = useState<Record<string, boolean>>({})
  const [vendorSaving, setVendorSaving] = useState<string | null>(null)
  const [vendorError, setVendorError]   = useState<Record<string, string | null>>({})
  const [vendorSaved, setVendorSaved]   = useState<Record<string, boolean>>({})

  /* ── Loaders ── */

  const loadTextbeltStatus = useCallback(async () => {
    setLoadingTextbelt(true)
    try {
      const res  = await fetch('/api/admin/textbelt')
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || 'Unable to load Textbelt quota')
      setTextbeltStatus({
        success: true,
        remaining:       typeof data.remaining       === 'number' ? data.remaining       : null,
        initialPurchased:typeof data.initialPurchased=== 'number' ? data.initialPurchased: null,
        apiKey:          typeof data.apiKey          === 'string' ? data.apiKey          : null,
        message: null,
      })
    } catch (e) {
      setTextbeltStatus({ success: false, remaining: null, initialPurchased: null, apiKey: null,
        message: e instanceof Error ? e.message : 'Unable to load Textbelt quota' })
    } finally { setLoadingTextbelt(false) }
  }, [])

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true)
    try {
      const res  = await fetch('/api/admin/showroom-settings')
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || 'Unable to load settings')
      setSettings(data.settings)
      setForm(data.settings)
    } catch (e) { console.error('Failed to load settings:', e) }
    finally { setLoadingSettings(false) }
  }, [])

  const loadVendorStatus = useCallback(async () => {
    try {
      const res  = await fetch('/api/admin/vendor-credentials')
      const data = await res.json()
      if (res.ok) setVendorStatus(data.status ?? {})
    } catch (e) { console.error('Failed to load vendor credential status:', e) }
  }, [])

  useEffect(() => { loadTextbeltStatus(); loadSettings(); loadVendorStatus() }, [loadTextbeltStatus, loadSettings, loadVendorStatus])

  /* ── Unsaved-changes guard ──
     Tab close / refresh / URL-bar navigation: */
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsavedChanges])

  /* In-app navigation (sidebar links, breadcrumbs, etc.) — capture phase so
     this runs before Next.js's own Link click handler, letting a cancel
     actually block the navigation instead of just reacting to it. */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!hasUnsavedChanges) return
      const link = (e.target as HTMLElement)?.closest('a')
      if (!link) return
      const href = link.getAttribute('href')
      if (!href || href.startsWith('#') || href === window.location.pathname) return
      const proceed = window.confirm('You have unsaved settings changes. Leave without saving?')
      if (!proceed) { e.preventDefault(); e.stopPropagation() }
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [hasUnsavedChanges])

  /* ── Save ── */

  const saveSettings = async () => {
    setSaving(true); setSaveError(null); setSaveSuccess(false)
    try {
      const body = {
        ...form,
        payment_methods: form.payment_methods.map((m, i) => ({ ...m, sort_order: i })),
      }
      const res = await fetch('/api/admin/showroom-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Failed to save') }
      const data = await res.json()
      setSettings(data.settings)
      setForm(data.settings)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save settings')
    } finally { setSaving(false) }
  }

  /* ── Payment methods helpers ── */

  const addMethod = () =>
    setForm(f => ({ ...f, payment_methods: [...f.payment_methods, newPaymentMethod(f.payment_methods.length)] }))

  const removeMethod = (id: string) =>
    setForm(f => ({ ...f, payment_methods: f.payment_methods.filter(m => m.id !== id) }))

  const updateMethod = (id: string, patch: Partial<PaymentMethod>) =>
    setForm(f => ({ ...f, payment_methods: f.payment_methods.map(m => m.id === id ? { ...m, ...patch } : m) }))

  /* ── CC Vendor credential helpers ──
     These save immediately on their own — they're not part of the main
     form/"Save All Changes" flow, since the secret is encrypted server-side
     the moment it's submitted rather than held in page state. */

  const saveVendorCredential = async (vendorKey: string, vendor: string, credentialKey: string) => {
    const value = vendorInputs[vendorKey]
    if (!value?.trim()) return
    setVendorSaving(vendorKey)
    setVendorError(e => ({ ...e, [vendorKey]: null }))
    try {
      const res  = await fetch('/api/admin/vendor-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor, credentialKey, value }),
      })
      const data = await res.json()
      if (!res.ok) { setVendorError(e => ({ ...e, [vendorKey]: data.error ?? 'Failed to save' })); return }
      setVendorStatus(s => ({ ...s, [vendorKey]: { configured: true, lastFour: data.lastFour, updatedAt: new Date().toISOString() } }))
      setVendorInputs(v => ({ ...v, [vendorKey]: '' }))
      setVendorSaved(s => ({ ...s, [vendorKey]: true }))
      setTimeout(() => setVendorSaved(s => ({ ...s, [vendorKey]: false })), 2500)
    } catch {
      setVendorError(e => ({ ...e, [vendorKey]: 'Failed to save' }))
    } finally {
      setVendorSaving(null)
    }
  }

  const removeVendorCredential = async (vendorKey: string, vendor: string, credentialKey: string) => {
    if (!window.confirm('Remove this credential? Any integration using it will stop working until a new one is added.')) return
    setVendorSaving(vendorKey)
    try {
      await fetch('/api/admin/vendor-credentials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor, credentialKey }),
      })
      setVendorStatus(s => ({ ...s, [vendorKey]: { configured: false, lastFour: null, updatedAt: null } }))
    } finally {
      setVendorSaving(null)
    }
  }

  /* ── Branding helpers ── */

  const updateColor = (key: keyof ThemeColors, value: string) => setColors({ ...colors, [key]: value })
  const applyPreset = (preset: ThemeColors) => setColors(preset)
  const handleBrandSave = () => { setBrandSaved(true); setTimeout(() => setBrandSaved(false), 2000) }

  /* ── Render ── */

  return (
    <div>
      <PageHeader
        eyebrow="Showroom Settings"
        title="Configuration"
        className="mb-10"
        accentColor="var(--r-violet)"
        actions={
          <button onClick={saveSettings} disabled={saving} className="cyber-btn btn--violet flex items-center gap-1.5">
            <Save size={14} /> {saving ? 'Saving…' : 'Save All Changes'}
          </button>
        }
      />

      {/* ── Save feedback (shown regardless of active tab) ── */}
      <AnimatePresence>
        {saveError && (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-2 text-sm p-3 rounded-lg mb-4"
            style={{ background: 'rgba(224,88,88,0.1)', color: 'var(--r-red)', border: '1px solid rgba(224,88,88,0.2)' }}
          >
            <AlertCircle size={14} className="shrink-0 mt-0.5" />{saveError}
          </motion.div>
        )}
        {saveSuccess && (
          <motion.div
            key="ok"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-sm p-3 rounded-lg mb-4"
            style={{ background: 'rgba(58,184,112,0.1)', color: 'var(--r-green)', border: '1px solid rgba(58,184,112,0.2)' }}
          >
            ✓ Settings saved successfully
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Folder tabs ── */}
      <div className="flex gap-1">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors"
              style={{
                background: active ? 'var(--color-surface)' : 'transparent',
                color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
                border: '1px solid var(--color-border)',
                borderBottom: active ? '1px solid var(--color-surface)' : '1px solid var(--color-border)',
                borderRadius: '14px 14px 0 0',
                marginBottom: '-1px',
                position: 'relative',
                zIndex: active ? 1 : 0,
              }}
            >
              <Icon size={14} style={{ color: active ? 'var(--r-violet)' : 'var(--color-text-muted)' }} />
              {label}
            </button>
          )
        })}
      </div>

      <div
        className="p-6 flex flex-col gap-6"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0 14px 14px 14px' }}
      >

        {/* ── Branding tab ── */}
        {activeTab === 'branding' && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Palette size={16} style={{ color: 'var(--color-accent)' }} />
                <h2 className="text-sm tracking-widest uppercase font-bold" style={{ color: 'var(--color-text)' }}>
                  Presets
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {PRESETS.map(preset => {
                  const active = isActivePreset(preset.colors, colors)
                  return (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset.colors)}
                      className={`group p-3 text-left transition-all relative ${active ? 'rainbow-ring' : ''}`}
                      style={{
                        background: preset.colors.surface,
                        border: active
                          ? '2px solid transparent'
                          : `1px solid ${preset.colors.border}`,
                        borderRadius: '10px',
                      }}
                    >
                      <div className="flex gap-1 mb-2">
                        {[preset.colors.background, preset.colors.primary, preset.colors.accent].map((c, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full"
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                      <p
                        className="text-xs font-medium"
                        style={{ color: preset.colors.text }}
                      >
                        {preset.name}
                      </p>
                      <p
                        className="text-xs font-semibold mt-1 tracking-wide"
                        style={{ color: preset.colors.primary, visibility: active ? 'visible' : 'hidden' }}
                      >
                        Current
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Eye size={16} style={{ color: 'var(--color-accent)' }} />
                <h2 className="text-sm tracking-widest uppercase font-bold" style={{ color: 'var(--color-text)' }}>
                  Custom Colors
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {COLOR_FIELDS.map(({ key, label, desc }) => (
                  <label
                    key={key}
                    className="relative flex flex-col items-center gap-1.5 p-2.5 cursor-pointer"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                    title={desc}
                  >
                    <div
                      className="w-full h-9 rounded"
                      style={{ background: colors[key], border: '1px solid var(--color-border)' }}
                    />
                    <p className="text-xs font-semibold text-center leading-tight" style={{ color: 'var(--color-text)' }}>
                      {label}
                    </p>
                    <p className="text-[10px] font-mono leading-tight" style={{ color: 'var(--color-text-muted)' }}>
                      {colors[key]}
                    </p>
                    <input
                      type="color"
                      value={colors[key]}
                      onChange={e => updateColor(key, e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title={`Pick ${label} color`}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div
              className="p-6"
              style={{ background: colors.background, border: `1px solid ${colors.border}` }}
            >
              <p className="text-xs tracking-widest uppercase mb-4" style={{ color: colors.primary }}>
                Preview
              </p>
              <div className="flex flex-wrap gap-3 items-center">
                <button
                  className="cyber-btn text-xs"
                  style={{ color: colors.primary, borderColor: colors.primary }}
                >
                  Primary Button
                </button>
                <button
                  className="cyber-btn cyber-btn-accent text-xs"
                  style={{ color: colors.accent, borderColor: colors.accent }}
                >
                  Accent Button
                </button>
                <span className="text-sm font-bold" style={{ color: colors.text }}>Body Text</span>
                <span className="text-sm" style={{ color: colors.textMuted }}>Muted Text</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={handleBrandSave} className="cyber-btn">
                {brandSaved ? <><Check size={14} /> Saved!</> : 'Save Brand Colors'}
              </button>
              <button
                onClick={resetColors}
                className="flex items-center gap-2 text-sm tracking-widest uppercase px-4 py-2 transition-colors"
                style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
              >
                <RotateCcw size={14} /> Reset to Default
              </button>
            </div>

            <section className="pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Settings size={16} style={{ color: 'var(--color-accent)' }} />
                <h2 className="text-sm tracking-widest uppercase font-bold" style={{ color: 'var(--color-text)' }}>
                  Social Media
                </h2>
              </div>
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                Handles shown in the site footer (leave a field empty to hide it). Saves with the main &quot;Save All Changes&quot; button above.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: 'instagram', label: 'Instagram', placeholder: '@handle' },
                  { key: 'facebook',  label: 'Facebook',  placeholder: 'username' },
                  { key: 'x',         label: 'X',         placeholder: '@handle' },
                  { key: 'tiktok',    label: 'TikTok',    placeholder: '@handle' },
                  { key: 'snapchat',  label: 'Snapchat',  placeholder: 'username' },
                  { key: 'youtube',   label: 'YouTube',   placeholder: '@channel' },
                  { key: 'linkedin',  label: 'LinkedIn',  placeholder: 'username' },
                  { key: 'threads',   label: 'Threads',   placeholder: '@handle' },
                  { key: 'bluesky',   label: 'Bluesky',   placeholder: '@handle.bsky.social' },
                  { key: 'mastodon',  label: 'Mastodon',  placeholder: '@handle@instance' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
                    <input
                      type="text"
                      value={(form[key as keyof ShowroomSettings] as string) || ''}
                      onChange={e => setForm({ ...form, [key]: e.target.value || null })}
                      className="cyber-input w-full"
                      placeholder={placeholder}
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ── Messaging tab ── */}
        {activeTab === 'messaging' && (
          <>
            <section>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(58,184,112,0.12)' }}>
                    <ShieldCheck size={18} style={{ color: 'var(--r-green)' }} />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Security</p>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>SMS login verification</h2>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold" style={{ color: form.two_factor_enabled ? 'var(--r-green)' : 'var(--color-text-muted)' }}>
                    {form.two_factor_enabled ? 'Live for all logins' : 'Off'}
                  </span>
                  <ToggleSwitch
                    checked={form.two_factor_enabled}
                    onChange={() => setForm(f => ({ ...f, two_factor_enabled: !f.two_factor_enabled }))}
                    label="SMS login verification"
                  />
                </div>
              </div>
              <p className="text-sm mt-3" style={{ color: 'var(--color-text-muted)' }}>
                When enabled, every login is texted a 6-digit code via Textbelt after the password
                step and must enter it to finish signing in. Codes are sent to the phone number on
                each profile and expire after 5 minutes. This setting saves with the main &quot;Save
                All Changes&quot; button above.
              </p>
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
                <strong style={{ color: 'var(--color-text)' }}>Email backup, built in:</strong> if a
                profile has no phone on file, the Textbelt key is missing, or the Textbelt send fails
                for any reason (including running out of credits), login automatically falls back to
                emailing the code instead via Supabase — so this can never lock an admin out of fixing
                it. Anyone on the text-code screen can also tap &quot;Email me a code&quot; to switch
                channels themselves if their phone isn&apos;t receiving texts.
              </p>
            </section>

            <section className="pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(138,64,216,0.12)' }}>
                    <Settings size={18} style={{ color: 'var(--r-violet)' }} />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Auto tracking</p>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Textbelt message package</h2>
                  </div>
                </div>
                <button onClick={loadTextbeltStatus} disabled={loadingTextbelt}
                  className="cyber-btn btn--violet btn--sm flex items-center gap-1">
                  <RefreshCcw size={12} /> {loadingTextbelt ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>

              {/* Condensed — just the numbers, no longer the loudest thing on the page */}
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl px-4 py-2.5" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Initial balance</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                    {textbeltStatus.initialPurchased === null ? '—' : textbeltStatus.initialPurchased}
                  </p>
                </div>
                <div className="rounded-xl px-4 py-2.5" style={creditsBlockStyle(textbeltStatus.remaining)}>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Remaining credits</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                    {textbeltStatus.remaining === null ? '—' : textbeltStatus.remaining}
                  </p>
                </div>
                <div className="rounded-xl px-4 py-2.5" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Status</p>
                  <p className="text-xs font-medium leading-snug mt-0.5" style={{ color: textbeltStatus.success ? 'var(--color-text)' : 'var(--r-red)' }}>
                    {textbeltStatus.message ?? (textbeltStatus.success ? 'Connected and tracking quota.' : 'Unable to load quota.')}
                  </p>
                </div>
              </div>

              {/* Everything else lives behind these — same steps as before, just not all on screen at once */}
              <div className="flex flex-wrap gap-2 mt-4">
                <button onClick={() => setTextbeltModal('about')} className="cyber-btn text-xs flex items-center gap-1.5">
                  <Info size={13} /> About
                </button>
                <button onClick={() => setTextbeltModal('balance')} className="cyber-btn btn--blue text-xs flex items-center gap-1.5">
                  <Search size={13} /> Check Balance
                </button>
                <button onClick={() => setTextbeltModal('reload')} className="cyber-btn btn--green text-xs flex items-center gap-1.5">
                  <RefreshCcw size={13} /> Reload
                </button>
                <button onClick={() => setTextbeltModal('api')} className="cyber-btn btn--violet text-xs flex items-center gap-1.5">
                  <Key size={13} /> Change API
                </button>
              </div>
            </section>

            <TextbeltInfoModal topic={textbeltModal} apiKey={textbeltStatus.apiKey} onClose={() => setTextbeltModal(null)} />
          </>
        )}

        {/* ── Products tab ── */}
        {activeTab === 'products' && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl" style={{ background: 'rgba(200,144,42,0.12)' }}>
                <Settings size={18} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Configure</p>
                <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Display & Email</h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <FieldRow label="Products per row" hint="1–12 columns">
                  <input type="number" min={1} max={12} value={form.products_per_row}
                    onChange={e => setForm({ ...form, products_per_row: parseInt(e.target.value) })}
                    className="cyber-input w-full" />
                </FieldRow>
                <FieldRow label="Rows per page" hint="1–10 rows">
                  <input type="number" min={1} max={10} value={form.rows_per_page}
                    onChange={e => setForm({ ...form, rows_per_page: parseInt(e.target.value) })}
                    className="cyber-input w-full" />
                </FieldRow>
                <FieldRow label="Inquiry form email">
                  <input type="email" value={form.inquiry_email}
                    onChange={e => setForm({ ...form, inquiry_email: e.target.value })}
                    className="cyber-input w-full" placeholder="admin@example.com" />
                </FieldRow>
              </div>
            </div>
          </section>
        )}

        {/* ── Orders tab ── */}
        {activeTab === 'orders' && (
          <>
            <section style={{ borderLeft: '3px solid var(--r-green)', paddingLeft: '1rem' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl" style={{ background: 'rgba(58,184,112,0.12)' }}>
                  <Truck size={18} style={{ color: 'var(--r-green)' }} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Checkout</p>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Tax & Shipping</h2>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                <FieldRow
                  label="Tax Rate"
                  hint={`${((form.tax_rate ?? 0) * 100).toFixed(2)}% — enter as decimal (e.g. 0.08 = 8%)`}
                >
                  <div className="relative">
                    <input
                      type="number" min={0} max={1} step={0.001}
                      value={form.tax_rate ?? 0}
                      onChange={e => setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 })}
                      className="cyber-input w-full pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>
                      {((form.tax_rate ?? 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                </FieldRow>

                <FieldRow label="Flat Shipping Fee" hint="Charged when order is below free threshold">
                  <div className="relative">
                    <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                    <input
                      type="number" min={0} step={0.01}
                      value={form.shipping_fee ?? 0}
                      onChange={e => setForm({ ...form, shipping_fee: parseFloat(e.target.value) || 0 })}
                      className="cyber-input w-full pl-8"
                    />
                  </div>
                </FieldRow>

                <FieldRow label="Free Shipping Threshold" hint="Set to 0 to always charge shipping">
                  <div className="relative">
                    <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                    <input
                      type="number" min={0} step={1}
                      value={form.free_shipping_threshold ?? 0}
                      onChange={e => setForm({ ...form, free_shipping_threshold: parseFloat(e.target.value) || 0 })}
                      className="cyber-input w-full pl-8"
                    />
                  </div>
                </FieldRow>
              </div>

              {(form.free_shipping_threshold ?? 0) > 0 && (
                <p className="mt-3 text-sm" style={{ color: 'var(--r-green)' }}>
                  Free shipping on orders ${form.free_shipping_threshold.toFixed(2)}+
                </p>
              )}
            </section>

            <section className="pt-6 border-t" style={{ borderColor: 'var(--color-border)', borderLeft: '3px solid var(--r-blue)', paddingLeft: '1rem' }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(56,120,224,0.12)' }}>
                    <CreditCard size={18} style={{ color: 'var(--r-blue)' }} />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Checkout</p>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Payment Methods</h2>
                  </div>
                </div>
                <button onClick={addMethod} className="cyber-btn btn--blue btn--sm flex items-center gap-1.5">
                  <Plus size={13} /> Add Method
                </button>
              </div>

              {form.payment_methods.length === 0 && (
                <div className="text-center py-10 rounded-xl" style={{ border: '1.5px dashed var(--color-border)' }}>
                  <CreditCard size={28} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No payment methods configured yet.</p>
                  <button onClick={addMethod} className="cyber-btn btn--blue btn--sm mt-3 mx-auto flex items-center gap-1.5">
                    <Plus size={13} /> Add your first method
                  </button>
                </div>
              )}

              <Reorder.Group
                axis="y"
                values={form.payment_methods}
                onReorder={methods => setForm(f => ({ ...f, payment_methods: methods }))}
                className="flex flex-col gap-4"
              >
                <AnimatePresence>
                  {form.payment_methods.map(method => (
                    <Reorder.Item
                      key={method.id}
                      value={method}
                      className="rounded-xl p-4"
                      style={{ background: 'var(--color-bg)', border: `1px solid ${method.enabled ? 'rgba(56,120,224,0.25)' : 'var(--color-border)'}`, opacity: method.enabled ? 1 : 0.55 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: method.enabled ? 1 : 0.55, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                    >
                      {/* Method header row — name, detail, type, and controls all in one compact row */}
                      <div className="flex items-center gap-2 mb-3">
                        {/* Drag handle */}
                        <GripVertical size={16} style={{ color: 'var(--color-border)', cursor: 'grab', flexShrink: 0 }} />

                        {/* Icon picker */}
                        <PaymentIconPicker value={method.icon} onChange={icon => updateMethod(method.id, { icon })} />

                        {/* Name — capped short so it can't crowd out Detail */}
                        <input
                          type="text"
                          value={method.name}
                          maxLength={25}
                          onChange={e => updateMethod(method.id, { name: e.target.value })}
                          placeholder="Name"
                          title="Method name (25 characters max)"
                          className="cyber-input font-semibold text-sm"
                          style={{ width: '9rem', flexShrink: 0 }}
                        />

                        {/* Detail — now inline with Name instead of its own row below */}
                        <input
                          type="text"
                          value={method.detail || ''}
                          onChange={e => updateMethod(method.id, { detail: e.target.value })}
                          placeholder="Detail — e.g. @username or payments@example.com"
                          title="Shown to the customer to know where to send payment"
                          className="cyber-input flex-1 text-sm"
                        />

                        {/* Type */}
                        <select
                          value={method.type}
                          onChange={e => updateMethod(method.id, { type: e.target.value as PaymentMethod['type'] })}
                          className="cyber-input text-xs"
                          style={{ width: '108px', flexShrink: 0 }}
                        >
                          <option value="instruction">Instructions</option>
                          <option value="redirect">Redirect Link</option>
                          <option value="stripe">Stripe</option>
                          <option value="square">Square</option>
                        </select>

                        {/* Enable toggle */}
                        <button
                          onClick={() => updateMethod(method.id, { enabled: !method.enabled })}
                          title={method.enabled ? 'Disable' : 'Enable'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                        >
                          {method.enabled
                            ? <ToggleRight size={22} style={{ color: 'var(--r-green)' }} />
                            : <ToggleLeft size={22} style={{ color: 'var(--color-border)' }} />
                          }
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => removeMethod(method.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                          style={{ color: 'var(--r-red)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Instructions / redirect / processor note — only the type-specific bit remains below */}
                      <div className="pl-[calc(16px+0.5rem+3.5rem+0.5rem)]">
                        {method.type === 'instruction' && (
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>
                              Customer Instructions
                            </label>
                            <textarea
                              value={method.instructions || ''}
                              onChange={e => updateMethod(method.id, { instructions: e.target.value })}
                              placeholder={`Send ${method.name || 'payment'} to {detail}. Include your order number in the memo. We'll ship within 1 business day of confirming payment.`}
                              className="cyber-input w-full text-sm"
                              rows={3}
                              style={{ resize: 'vertical' }}
                            />
                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                              Use <code style={{ color: 'var(--r-blue)' }}>{'{detail}'}</code> to insert the detail value above
                            </p>
                          </div>
                        )}

                        {method.type === 'redirect' && (
                          <div className="flex flex-col gap-3">
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>
                                Redirect URL
                              </label>
                              <input
                                type="url"
                                value={method.redirect_url || ''}
                                onChange={e => updateMethod(method.id, { redirect_url: e.target.value })}
                                placeholder="e.g. https://venmo.com/u/yourname or https://paypal.me/yourname"
                                className="cyber-input w-full text-sm"
                              />
                              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                At checkout, the customer gets a button that opens this link in a new tab to complete payment on {method.name || 'the'}&apos;s own site.
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>
                                Instructions (optional)
                              </label>
                              <textarea
                                value={method.instructions || ''}
                                onChange={e => updateMethod(method.id, { instructions: e.target.value })}
                                placeholder="Include your order number in the payment note."
                                className="cyber-input w-full text-sm"
                                rows={2}
                                style={{ resize: 'vertical' }}
                              />
                            </div>
                          </div>
                        )}

                        {(method.type === 'stripe' || method.type === 'square') && (
                          <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(56,120,224,0.06)', border: '1px solid rgba(56,120,224,0.15)', color: 'var(--color-text-muted)' }}>
                            {method.type === 'stripe'
                              ? 'Add your Stripe Secret Key under the CC Vendors tab above. Live checkout integration is separate future work — see the payment + tax project notes in the docs.'
                              : 'Add your Square Access Token under the CC Vendors tab above. Live checkout integration is separate future work — see the payment + tax project notes in the docs.'
                            }
                          </div>
                        )}
                      </div>
                    </Reorder.Item>
                  ))}
                </AnimatePresence>
              </Reorder.Group>

              {form.payment_methods.length > 0 && (
                <p className="text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
                  Drag to reorder · Toggle to enable/disable · Changes save with the main &quot;Save All Changes&quot; button above
                </p>
              )}
            </section>
          </>
        )}

        {/* ── CC Vendors tab ── */}
        {activeTab === 'vendors' && (
          <section>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl" style={{ background: 'rgba(200,144,42,0.12)' }}>
                <CreditCard size={18} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Payment Processors</p>
                <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>CC Vendors</h2>
              </div>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
              Enter each processor&apos;s credential here instead of Vercel&apos;s environment variables.
              It&apos;s encrypted before being stored and never shown again after saving — only the last
              4 characters stay visible so you can confirm which key is active. Each field saves on its
              own the moment you click Save, separately from the main &quot;Save All Changes&quot; button.
            </p>

            <div className="flex flex-col gap-4">
              {VENDORS.map(v => {
                const vendorKey = `${v.vendor}:${v.credentialKey}`
                const status  = vendorStatus[vendorKey]
                const busy    = vendorSaving === vendorKey
                const showing = !!vendorShow[vendorKey]
                return (
                  <div key={vendorKey} className="rounded-xl p-4" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <v.Icon size={22} style={{ color: v.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{v.label}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {status?.configured
                            ? `Configured — ending •••• ${status.lastFour}${status.updatedAt ? ` · updated ${new Date(status.updatedAt).toLocaleDateString()}` : ''}`
                            : 'Not configured'}
                        </p>
                      </div>
                      {status?.configured && (
                        <button
                          onClick={() => removeVendorCredential(vendorKey, v.vendor, v.credentialKey)}
                          disabled={busy}
                          className="text-xs flex items-center gap-1"
                          style={{ color: 'var(--r-red)', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showing ? 'text' : 'password'}
                          value={vendorInputs[vendorKey] ?? ''}
                          onChange={e => setVendorInputs(i => ({ ...i, [vendorKey]: e.target.value }))}
                          placeholder={status?.configured ? `New ${v.credentialLabel} (replaces current)` : v.credentialLabel}
                          className="cyber-input w-full pr-10 text-sm"
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          onClick={() => setVendorShow(s => ({ ...s, [vendorKey]: !s[vendorKey] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                          style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          {showing ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      <button
                        onClick={() => saveVendorCredential(vendorKey, v.vendor, v.credentialKey)}
                        disabled={busy || !vendorInputs[vendorKey]?.trim()}
                        className="cyber-btn btn--sm"
                      >
                        {busy ? <Loader size={13} className="animate-spin" /> : <Save size={13} />}
                      </button>
                    </div>

                    {vendorError[vendorKey] && (
                      <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'var(--r-red)' }}>
                        <AlertCircle size={12} /> {vendorError[vendorKey]}
                      </p>
                    )}
                    {vendorSaved[vendorKey] && (
                      <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'var(--r-green)' }}>
                        <Check size={12} /> Saved and encrypted
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-6 p-3 rounded-lg text-xs" style={{ background: 'rgba(212,176,48,0.08)', border: '1px solid rgba(212,176,48,0.2)', color: 'var(--color-text-muted)' }}>
              These are stored for future use once a payment integration is actually built — saving a
              key here secures it in place but does not yet enable live charges. See the payment +
              tax project notes in the project docs before wiring one up.
            </div>
          </section>
        )}

      </div>

      {/* Duplicate Save — the tab panel above can get tall enough that the header's
          button scrolls out of view, and it shouldn't look like changes auto-save. */}
      <div className="flex items-center gap-3 mt-6">
        <button onClick={saveSettings} disabled={saving} className="cyber-btn btn--violet flex items-center gap-1.5">
          <Save size={14} /> {saving ? 'Saving…' : 'Save All Changes'}
        </button>
        {hasUnsavedChanges && !saving && (
          <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--r-yellow)' }}>
            <AlertCircle size={13} /> Unsaved changes
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Field row helper ── */

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </label>
      {children}
      {hint && <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>}
    </div>
  )
}

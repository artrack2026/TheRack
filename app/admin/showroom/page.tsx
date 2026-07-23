'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  RefreshCcw, Settings, Info, ExternalLink, Save, AlertCircle,
  Plus, Trash2, GripVertical, ToggleLeft, ToggleRight, DollarSign, Truck, CreditCard,
  Palette, Eye, RotateCcw, Check, MessageSquareMore, Package, ClipboardList,
  ShieldCheck,
} from 'lucide-react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { PaymentMethod, ThemeColors } from '@/lib/types'
import { useTheme } from '@/components/ThemeProvider'
import PageHeader from '@/components/PageHeader'

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

const PAYMENT_ICONS = ['💳', '📱', '💸', '🏦', '⚡', '🔵', '🟡', '🟢', '🟠', '⬜']

function newPaymentMethod(order: number): PaymentMethod {
  return {
    id: crypto.randomUUID(),
    name: '',
    enabled: true,
    type: 'instruction',
    icon: '💳',
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

type TabKey = 'branding' | 'messaging' | 'products' | 'orders'

const TABS: { key: TabKey; label: string; icon: typeof Palette }[] = [
  { key: 'branding',  label: 'Branding',  icon: Palette },
  { key: 'messaging', label: 'Messaging', icon: MessageSquareMore },
  { key: 'products',  label: 'Products',  icon: Package },
  { key: 'orders',    label: 'Orders',    icon: ClipboardList },
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
  const [loadingTextbelt, setLoadingTextbelt] = useState(true)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

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

  useEffect(() => { loadTextbeltStatus(); loadSettings() }, [loadTextbeltStatus, loadSettings])

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
              <div className="flex items-center justify-between mb-4">
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

              <div className="grid gap-3 mt-4 sm:grid-cols-3">
                <div className="rounded-3xl p-5" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                  <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Initially purchased</p>
                  <p className="text-4xl font-black" style={{ color: 'var(--color-text)' }}>
                    {textbeltStatus.initialPurchased === null ? 'Not configured' : textbeltStatus.initialPurchased}
                  </p>
                </div>
                <div className="rounded-3xl p-5" style={creditsBlockStyle(textbeltStatus.remaining)}>
                  <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Remaining credits</p>
                  <p className="text-4xl font-black" style={{ color: 'var(--color-text)' }}>
                    {textbeltStatus.remaining === null ? '—' : textbeltStatus.remaining}
                  </p>
                </div>
                <div className="rounded-3xl p-5" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                  <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Status</p>
                  <p className="text-sm font-medium" style={{ color: textbeltStatus.success ? 'var(--color-text)' : 'var(--r-red)' }}>
                    {textbeltStatus.message ?? (textbeltStatus.success ? 'Connected and tracking quota successfully.' : 'Unable to load Textbelt quota.')}
                  </p>
                </div>
              </div>
            </section>

            <section className="pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
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
                <button
                  onClick={() => setForm(f => ({ ...f, two_factor_enabled: !f.two_factor_enabled }))}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{
                    background: form.two_factor_enabled ? 'rgba(58,184,112,0.12)' : 'var(--color-bg)',
                    border: `1px solid ${form.two_factor_enabled ? 'var(--r-green)' : 'var(--color-border)'}`,
                    color: form.two_factor_enabled ? 'var(--r-green)' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {form.two_factor_enabled
                    ? <><ToggleRight size={18} /> Live for all logins</>
                    : <><ToggleLeft size={18} /> Off</>
                  }
                </button>
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
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl" style={{ background: 'rgba(200,144,42,0.12)' }}>
                  <Info size={18} style={{ color: 'var(--color-accent)' }} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Message flow</p>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Load more Textbelt credits</h2>
                </div>
              </div>

              <ol className="space-y-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <li>
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>1.</span>{' '}
                  Visit the Textbelt purchase page:{' '}
                  <a href="https://textbelt.com/purchase/" target="_blank" rel="noreferrer" className="underline" style={{ color: 'var(--color-accent)' }}>textbelt.com/purchase</a>.
                </li>
                <li>
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>2.</span>{' '}
                  When adding credits, use your active API key:
                  <div className="mt-2 px-3 py-2 rounded-lg text-xs font-mono" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-accent)', wordBreak: 'break-all' }}>
                    {textbeltStatus.apiKey ?? 'Not configured'}
                  </div>
                </li>
                <li>
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>3.</span>{' '}
                  Keep this same key in Vercel and <code>.env.local</code> so you do not need a new whitelist after purchasing credits.
                </li>
                <li>
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>4.</span>{' '}
                  After purchase, refresh this page to auto-update the remaining quota.
                </li>
                <li>
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>5.</span>{' '}
                  For receipts, 2FA, promo alerts, and order updates, continue sending with the same paid key so links work without extra whitelisting.
                </li>
                <li>
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>6.</span>{' '}
                  If you want to verify the key without consuming quota, use <code>_test</code> appended to your key on the <code>/text</code> endpoint.
                </li>
              </ol>

              <div className="mt-6 p-4 rounded-3xl" style={{ background: 'rgba(58,184,112,0.08)', border: '1px solid rgba(58,184,112,0.14)' }}>
                <p className="text-xs uppercase tracking-[0.3em] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Helpful note</p>
                <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                  The page automatically refreshes the remaining quota whenever you click refresh, so you can quickly confirm your current package status.
                </p>
              </div>

              <a href="https://docs.textbelt.com/#checking-your-quota" target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 mt-6 text-sm font-semibold"
                style={{ color: 'var(--color-accent)' }}>
                Learn more <ExternalLink size={14} />
              </a>
            </section>
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
                      {/* Method header row */}
                      <div className="flex items-center gap-3 mb-3">
                        {/* Drag handle */}
                        <GripVertical size={16} style={{ color: 'var(--color-border)', cursor: 'grab', flexShrink: 0 }} />

                        {/* Icon picker */}
                        <select
                          value={method.icon}
                          onChange={e => updateMethod(method.id, { icon: e.target.value })}
                          className="cyber-input text-center"
                          style={{ width: '3.5rem', padding: '0.35rem 0.3rem', fontSize: '1.1rem' }}
                        >
                          {PAYMENT_ICONS.map(i => <option key={i} value={i}>{i}</option>)}
                        </select>

                        {/* Name */}
                        <input
                          type="text"
                          value={method.name}
                          onChange={e => updateMethod(method.id, { name: e.target.value })}
                          placeholder="Method name (e.g. Zelle, Apple Pay, Stripe)"
                          className="cyber-input flex-1 font-semibold"
                        />

                        {/* Type */}
                        <select
                          value={method.type}
                          onChange={e => updateMethod(method.id, { type: e.target.value as PaymentMethod['type'] })}
                          className="cyber-input text-xs"
                          style={{ width: '110px' }}
                        >
                          <option value="instruction">Instruction</option>
                          <option value="stripe">Stripe</option>
                          <option value="square">Square</option>
                        </select>

                        {/* Enable toggle */}
                        <button
                          onClick={() => updateMethod(method.id, { enabled: !method.enabled })}
                          title={method.enabled ? 'Disable' : 'Enable'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
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
                          style={{ color: 'var(--r-red)', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Detail + Instructions */}
                      <div className="grid gap-3 pl-[calc(16px+0.75rem+3.5rem+0.75rem)]">
                        {method.type === 'instruction' && (
                          <>
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>
                                Detail
                              </label>
                              <input
                                type="text"
                                value={method.detail || ''}
                                onChange={e => updateMethod(method.id, { detail: e.target.value })}
                                placeholder="e.g. payments@example.com  or  @username  or  +1 555-555-0123"
                                className="cyber-input w-full text-sm"
                              />
                              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                Shown to the customer to know where to send payment
                              </p>
                            </div>
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
                          </>
                        )}

                        {(method.type === 'stripe' || method.type === 'square') && (
                          <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(56,120,224,0.06)', border: '1px solid rgba(56,120,224,0.15)', color: 'var(--color-text-muted)' }}>
                            {method.type === 'stripe'
                              ? 'Configure Stripe via STRIPE_SECRET_KEY in your environment variables. The checkout will redirect to Stripe Checkout.'
                              : 'Configure Square via SQUARE_ACCESS_TOKEN in your environment variables. The checkout will use Square Web Payments SDK.'
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

'use client'

import { useEffect, useState } from 'react'
import { RefreshCcw, Settings, Info, ExternalLink, Save, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

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
}

export default function ShowroomSettingsPage() {
  const [textbeltStatus, setTextbeltStatus] = useState<TextbeltStatus>({
    success: false,
    remaining: null,
    initialPurchased: null,
    apiKey: null,
    message: 'Loading showroom settings…',
  })
  const [settings, setSettings] = useState<ShowroomSettings>({
    products_per_row: 4,
    rows_per_page: 2,
    inquiry_email: '',
    instagram: null,
    facebook: null,
    x: null,
    tiktok: null,
    snapchat: null,
    youtube: null,
    linkedin: null,
    threads: null,
    bluesky: null,
    mastodon: null,
  })
  const [settingsForm, setSettingsForm] = useState<ShowroomSettings>({
    products_per_row: 4,
    rows_per_page: 2,
    inquiry_email: '',
    instagram: null,
    facebook: null,
    x: null,
    tiktok: null,
    snapchat: null,
    youtube: null,
    linkedin: null,
    threads: null,
    bluesky: null,
    mastodon: null,
  })
  const [loadingTextbelt, setLoadingTextbelt] = useState(true)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const loadTextbeltStatus = async () => {
    setLoadingTextbelt(true)
    try {
      const res = await fetch('/api/admin/textbelt')
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Unable to load Textbelt quota')
      }

      setTextbeltStatus({
        success: true,
        remaining: typeof data.remaining === 'number' ? data.remaining : null,
        initialPurchased: typeof data.initialPurchased === 'number' ? data.initialPurchased : null,
        apiKey: typeof data.apiKey === 'string' ? data.apiKey : null,
        message: null,
      })
    } catch (error) {
      setTextbeltStatus({
        success: false,
        remaining: null,
        initialPurchased: null,
        apiKey: null,
        message: error instanceof Error ? error.message : 'Unable to load Textbelt quota',
      })
    } finally {
      setLoadingTextbelt(false)
    }
  }

  const loadSettings = async () => {
    setLoadingSettings(true)
    try {
      const res = await fetch('/api/admin/showroom-settings')
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Unable to load settings')
      }

      setSettings(data.settings)
      setSettingsForm(data.settings)
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoadingSettings(false)
    }
  }

  const saveSettings = async () => {
    setSavingSettings(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const res = await fetch('/api/admin/showroom-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to save settings')
      }

      const data = await res.json()
      setSettings(data.settings)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  useEffect(() => {
    loadTextbeltStatus()
    loadSettings()
  }, [])

  return (
    <div>
      <div className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase font-semibold mb-1" style={{ color: 'var(--r-violet)' }}>
              Showroom Settings
            </p>
            <h1 className="text-4xl font-black" style={{ color: 'var(--color-text)' }}>
              Configuration & Tracking
            </h1>
            <p className="mt-3 max-w-2xl text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Manage Textbelt messaging, display settings, and form email configuration.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        {/* Textbelt Section */}
        <section className="p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '18px' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ background: 'rgba(138,64,216,0.12)' }}>
                <Settings size={18} style={{ color: 'var(--r-violet)' }} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  Auto tracking
                </p>
                <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                  Textbelt message package
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={loadTextbeltStatus}
              className="cyber-btn text-xs flex items-center gap-1"
              style={{ borderColor: 'var(--r-violet)', color: 'var(--r-violet)' }}
              disabled={loadingTextbelt}
            >
              <RefreshCcw size={12} />
              {loadingTextbelt ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          <div className="grid gap-3 mt-4">
            <div className="rounded-3xl p-5" style={{ background: 'rgba(58,184,112,0.08)', border: '1px solid rgba(58,184,112,0.14)' }}>
              <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Remaining credits
              </p>
              <p className="text-4xl font-black" style={{ color: 'var(--color-text)' }}>
                {textbeltStatus.remaining === null ? '—' : textbeltStatus.remaining}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Current quota remaining for the active Textbelt API key.
              </p>
            </div>

            <div className="rounded-3xl p-5" style={{ background: 'rgba(224,88,88,0.08)', border: '1px solid rgba(224,88,88,0.14)' }}>
              <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Initially purchased
              </p>
              <p className="text-4xl font-black" style={{ color: 'var(--color-text)' }}>
                {textbeltStatus.initialPurchased === null ? 'Not configured' : textbeltStatus.initialPurchased}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Set `TEXTBELT_INITIAL_QUOTA` in your environment to track the original package size.
              </p>
            </div>

            <div className="rounded-3xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Status
              </p>
              <p className="text-sm font-medium" style={{ color: textbeltStatus.success ? 'var(--color-text)' : 'var(--r-red)' }}>
                {textbeltStatus.message ?? (textbeltStatus.success ? 'Connected and tracking quota successfully.' : 'Unable to load Textbelt quota.')}
              </p>
            </div>
          </div>
        </section>

        {/* Display & Email Settings Section */}
        <section className="p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '18px' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(200,144,42,0.12)' }}>
              <Settings size={18} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                Configure
              </p>
              <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                Display & Email
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            {/* Products per row */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Products per row
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={settingsForm.products_per_row}
                onChange={e => setSettingsForm({ ...settingsForm, products_per_row: parseInt(e.target.value) })}
                className="cyber-input w-full"
                style={{ fontSize: '0.9rem' }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                1–12 columns
              </p>
            </div>

            {/* Rows per page */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Rows per page
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={settingsForm.rows_per_page}
                onChange={e => setSettingsForm({ ...settingsForm, rows_per_page: parseInt(e.target.value) })}
                className="cyber-input w-full"
                style={{ fontSize: '0.9rem' }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                1–10 rows per page
              </p>
            </div>

            {/* Inquiry email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Inquiry form email
              </label>
              <input
                type="email"
                value={settingsForm.inquiry_email}
                onChange={e => setSettingsForm({ ...settingsForm, inquiry_email: e.target.value })}
                className="cyber-input w-full"
                placeholder="admin@example.com"
                style={{ fontSize: '0.9rem' }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Where contact form messages are sent
              </p>
            </div>

            {/* Social media section */}
            <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-muted)' }}>
                Social media handles (leave empty to hide)
              </p>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'instagram', label: 'Instagram', placeholder: '@handle' },
                  { key: 'facebook', label: 'Facebook', placeholder: 'username' },
                  { key: 'x', label: 'X', placeholder: '@handle' },
                  { key: 'tiktok', label: 'TikTok', placeholder: '@handle' },
                  { key: 'snapchat', label: 'Snapchat', placeholder: 'username' },
                  { key: 'youtube', label: 'YouTube', placeholder: '@channel' },
                  { key: 'linkedin', label: 'LinkedIn', placeholder: 'username' },
                  { key: 'threads', label: 'Threads', placeholder: '@handle' },
                  { key: 'bluesky', label: 'Bluesky', placeholder: '@handle.bsky.social' },
                  { key: 'mastodon', label: 'Mastodon', placeholder: '@handle@instance' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                      {label}
                    </label>
                    <input
                      type="text"
                      value={settingsForm[key as keyof ShowroomSettings] as string || ''}
                      onChange={e => setSettingsForm({ ...settingsForm, [key]: e.target.value || null })}
                      className="cyber-input w-full text-xs"
                      placeholder={placeholder}
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Errors & Success */}
            {saveError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 text-sm p-3 rounded-lg"
                style={{ background: 'rgba(224,88,88,0.1)', color: 'var(--r-red)', border: '1px solid rgba(224,88,88,0.2)' }}
              >
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{saveError}</span>
              </motion.div>
            )}

            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 text-sm p-3 rounded-lg"
                style={{ background: 'rgba(58,184,112,0.1)', color: 'var(--r-green)', border: '1px solid rgba(58,184,112,0.2)' }}
              >
                <span>✓ Settings saved successfully</span>
              </motion.div>
            )}

            {/* Save button */}
            <button
              type="button"
              onClick={saveSettings}
              disabled={savingSettings || (
                settingsForm.products_per_row === settings.products_per_row &&
                settingsForm.rows_per_page === settings.rows_per_page &&
                settingsForm.inquiry_email === settings.inquiry_email &&
                settingsForm.instagram === settings.instagram &&
                settingsForm.facebook === settings.facebook &&
                settingsForm.x === settings.x &&
                settingsForm.tiktok === settings.tiktok &&
                settingsForm.snapchat === settings.snapchat &&
                settingsForm.youtube === settings.youtube &&
                settingsForm.linkedin === settings.linkedin &&
                settingsForm.threads === settings.threads &&
                settingsForm.bluesky === settings.bluesky &&
                settingsForm.mastodon === settings.mastodon
              )}
              className="cyber-btn w-full justify-center text-sm"
              style={{
                borderColor: 'var(--color-primary)',
                color: 'var(--color-primary)',
                opacity: savingSettings ? 0.6 : 1,
              }}
            >
              <Save size={14} /> {savingSettings ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </section>
      </div>

      {/* Textbelt instructions */}
      <section className="mt-6 p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '18px' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(200,144,42,0.12)' }}>
            <Info size={18} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
              Message flow
            </p>
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
              Load more Textbelt credits
            </h2>
          </div>
        </div>

        <ol className="space-y-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <li>
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>1.</span> Visit the Textbelt purchase page: <a href="https://textbelt.com/purchase/" target="_blank" rel="noreferrer" className="underline" style={{ color: 'var(--color-primary)' }}>textbelt.com/purchase</a>.
          </li>
          <li>
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>2.</span> When adding credits, use your active API key:
            <div className="mt-2 px-3 py-2 rounded-lg text-xs font-mono" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-primary)', wordBreak: 'break-all' }}>
              {textbeltStatus.apiKey ? textbeltStatus.apiKey : 'Not configured'}
            </div>
          </li>
          <li>
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>3.</span> Keep this same key in Vercel and `.env.local` so you do not need a new whitelist after purchasing credits.
          </li>
          <li>
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>4.</span> After purchase, refresh this page to auto-update the remaining quota.
          </li>
          <li>
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>5.</span> For receipts, 2FA, promo alerts, and order updates, continue sending with the same paid key so links work without extra whitelisting.
          </li>
          <li>
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>6.</span> If you want to verify the key without consuming quota, use `_test` appended to your key on the `/text` endpoint.
          </li>
        </ol>

        <div className="mt-6 p-4 rounded-3xl" style={{ background: 'rgba(58,184,112,0.08)', border: '1px solid rgba(58,184,112,0.14)' }}>
          <p className="text-xs uppercase tracking-[0.3em] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
            Helpful note
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text)' }}>
            The page automatically refreshes the remaining quota whenever you click refresh, so you can quickly confirm your current package status.
          </p>
        </div>

        <a
          href="https://docs.textbelt.com/#checking-your-quota"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 mt-6 text-sm font-semibold"
          style={{ color: 'var(--color-primary)' }}
        >
          Learn more <ExternalLink size={14} />
        </a>
      </section>
    </div>
  )
}

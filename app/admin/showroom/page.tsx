'use client'

import { useEffect, useState } from 'react'
import { RefreshCcw, Settings, Info, ExternalLink } from 'lucide-react'

interface TextbeltStatus {
  success: boolean
  remaining: number | null
  initialPurchased: number | null
  message: string | null
}

export default function ShowroomSettingsPage() {
  const [status, setStatus] = useState<TextbeltStatus>({
    success: false,
    remaining: null,
    initialPurchased: null,
    message: 'Loading showroom settings…',
  })
  const [loading, setLoading] = useState(true)

  const loadStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/textbelt')
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Unable to load Textbelt quota')
      }

      setStatus({
        success: true,
        remaining: typeof data.remaining === 'number' ? data.remaining : null,
        initialPurchased: typeof data.initialPurchased === 'number' ? data.initialPurchased : null,
        message: null,
      })
    } catch (error) {
      setStatus({
        success: false,
        remaining: null,
        initialPurchased: null,
        message: error instanceof Error ? error.message : 'Unable to load showroom settings',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
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
              Textbelt Auto Tracking
            </h1>
            <p className="mt-3 max-w-2xl text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Track API credits, message package usage, and follow the steps to add more credits to your existing Textbelt key.
            </p>
          </div>

          <button
            type="button"
            onClick={loadStatus}
            className="cyber-btn text-sm flex items-center gap-2"
            style={{ borderColor: 'var(--r-violet)', color: 'var(--r-violet)' }}
            disabled={loading}
          >
            <RefreshCcw size={14} />
            {loading ? 'Refreshing…' : 'Refresh status'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
        <section className="p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '18px' }}>
          <div className="flex items-center gap-3 mb-4">
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

          <div className="grid gap-3 mt-4">
            <div className="rounded-3xl p-5" style={{ background: 'rgba(58,184,112,0.08)', border: '1px solid rgba(58,184,112,0.14)' }}>
              <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Remaining credits
              </p>
              <p className="text-4xl font-black" style={{ color: 'var(--color-text)' }}>
                {status.remaining === null ? '—' : status.remaining}
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
                {status.initialPurchased === null ? 'Not configured' : status.initialPurchased}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Set `TEXTBELT_INITIAL_QUOTA` in your environment to track the original package size.
              </p>
            </div>

            <div className="rounded-3xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Status
              </p>
              <p className="text-sm font-medium" style={{ color: status.success ? 'var(--color-text)' : 'var(--r-red)' }}>
                {status.message ?? (status.success ? 'Connected and tracking quota successfully.' : 'Unable to load Textbelt quota.')}
              </p>
            </div>
          </div>
        </section>

        <aside className="p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '18px' }}>
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
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>2.</span> Add credits to your existing API key. Keep the same key in Vercel and `.env.local` so you do not need a new whitelist.
            </li>
            <li>
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>3.</span> After purchase, refresh this page to auto-update the remaining quota.
            </li>
            <li>
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>4.</span> For receipts, 2FA, promo alerts, and order updates, continue sending with the same paid key so links work without extra whitelisting.
            </li>
            <li>
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>5.</span> If you want to verify the key without consuming quota, use `<code>_test</code>` appended to your key on the `/text` endpoint.
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
        </aside>
      </div>
    </div>
  )
}

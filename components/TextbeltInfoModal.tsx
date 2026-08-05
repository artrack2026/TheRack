'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, Info, Search, RefreshCcw, Key } from 'lucide-react'

export type TextbeltTopic = 'about' | 'balance' | 'reload' | 'api'

interface Props {
  topic: TextbeltTopic | null
  apiKey: string | null
  onClose: () => void
}

const TOPIC_META: Record<TextbeltTopic, { title: string; icon: typeof Info; color: string }> = {
  about:   { title: 'About Textbelt',           icon: Info,       color: 'var(--color-accent)' },
  balance: { title: 'Checking Your Balance',     icon: Search,     color: 'var(--r-blue)' },
  reload:  { title: 'Adding More Credits',       icon: RefreshCcw, color: 'var(--r-green)' },
  api:     { title: 'Changing Your API Key',     icon: Key,        color: 'var(--r-violet)' },
}

export default function TextbeltInfoModal({ topic, apiKey, onClose }: Props) {
  return (
    <AnimatePresence>
      {topic && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            className="w-full max-w-lg overflow-y-auto"
            style={{ maxHeight: '85vh', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '18px' }}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-2.5">
                {(() => { const Icon = TOPIC_META[topic].icon; return <Icon size={16} style={{ color: TOPIC_META[topic].color }} /> })()}
                <p className="font-bold" style={{ color: 'var(--color-text)' }}>{TOPIC_META[topic].title}</p>
              </div>
              <button onClick={onClose} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div className="p-6 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              {topic === 'about' && <AboutContent />}
              {topic === 'balance' && <BalanceContent />}
              {topic === 'reload' && <ReloadContent apiKey={apiKey} />}
              {topic === 'api' && <ApiContent />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function AboutContent() {
  return (
    <div className="flex flex-col gap-3">
      <p>
        <strong style={{ color: 'var(--color-text)' }}>Textbelt</strong> is a simple, pay-as-you-go SMS API —
        you buy a block of message credits once, and every text sent through their API uses up one credit.
        No monthly subscription, no per-user pricing.
      </p>
      <a href="https://textbelt.com" target="_blank" rel="noreferrer"
        className="inline-flex items-center gap-1.5 font-semibold w-fit" style={{ color: 'var(--color-accent)' }}>
        textbelt.com <ExternalLink size={13} />
      </a>
      <p>
        <strong style={{ color: 'var(--color-text)' }}>What it&apos;s used for on this site:</strong> two things —
        the 6-digit code texted during login when SMS verification is on, and the code texted to a{' '}
        <em>new</em> phone number before it replaces the one on a profile, so a typo can never lock someone
        out of 2FA later.
      </p>
      <p>
        <strong style={{ color: 'var(--color-text)' }}>Why keep credits stocked:</strong> every send costs one
        credit. If the balance hits zero, sends fail and the system automatically falls back to emailing the
        code instead — so nobody gets physically locked out — but that fallback is slower and depends on the
        recipient checking email instead of just glancing at their phone. Running low quietly undermines the
        whole point of having SMS verification.
      </p>
      <p>
        This page now emails every admin automatically once the balance drops below 100 credits — but treat
        that as a prompt to reload soon, not a guarantee texts will keep working until you do.
      </p>
    </div>
  )
}

function BalanceContent() {
  return (
    <div className="flex flex-col gap-3">
      <p>
        The three cards on the Messaging tab — <strong style={{ color: 'var(--color-text)' }}>Initial
        Purchased</strong>, <strong style={{ color: 'var(--color-text)' }}>Remaining Credits</strong>, and{' '}
        <strong style={{ color: 'var(--color-text)' }}>Status</strong> — reflect Textbelt&apos;s live quota for
        the configured API key, pulled automatically whenever this page loads.
      </p>
      <p>
        To refresh instantly without reloading the page, use the <strong style={{ color: 'var(--color-text)' }}>Refresh</strong> button
        next to the Textbelt section header.
      </p>
      <p>
        To check outside the admin panel, Textbelt exposes a quota API directly — useful if you ever want to
        verify from the command line or another tool.
      </p>
      <a href="https://docs.textbelt.com/#checking-your-quota" target="_blank" rel="noreferrer"
        className="inline-flex items-center gap-1.5 font-semibold w-fit" style={{ color: 'var(--color-accent)' }}>
        docs.textbelt.com — Checking Your Quota <ExternalLink size={13} />
      </a>
      <p>
        You&apos;ll also get an automatic email if the balance drops below 100 credits — see <strong style={{ color: 'var(--color-text)' }}>About</strong> for
        why that threshold matters.
      </p>
    </div>
  )
}

function ReloadContent({ apiKey }: { apiKey: string | null }) {
  return (
    <div className="flex flex-col gap-4">
      <ol className="space-y-4">
        <li>
          <span className="font-semibold" style={{ color: 'var(--color-text)' }}>1.</span>{' '}
          Visit the Textbelt purchase page:{' '}
          <a href="https://textbelt.com/purchase/" target="_blank" rel="noreferrer" className="underline" style={{ color: 'var(--color-accent)' }}>
            textbelt.com/purchase
          </a>.
        </li>
        <li>
          <span className="font-semibold" style={{ color: 'var(--color-text)' }}>2.</span>{' '}
          When purchasing, enter your <strong style={{ color: 'var(--color-text)' }}>existing</strong> API key below —
          this adds credits to the same key instead of issuing a new one:
          <div className="mt-2 px-3 py-2 rounded-lg text-xs font-mono" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-accent)', wordBreak: 'break-all' }}>
            {apiKey ?? 'Not configured'}
          </div>
        </li>
        <li>
          <span className="font-semibold" style={{ color: 'var(--color-text)' }}>3.</span>{' '}
          Complete the purchase.
        </li>
        <li>
          <span className="font-semibold" style={{ color: 'var(--color-text)' }}>4.</span>{' '}
          Come back here and click Refresh (or reload the page) to confirm the new balance.
        </li>
        <li>
          <span className="font-semibold" style={{ color: 'var(--color-text)' }}>5.</span>{' '}
          Keep using this same key for all future sends — login codes, phone verification, receipts —
          so nothing needs to be re-whitelisted.
        </li>
        <li>
          <span className="font-semibold" style={{ color: 'var(--color-text)' }}>6.</span>{' '}
          To test the key without spending a credit, append <code>_test</code> to it when calling the{' '}
          <code>/text</code> endpoint directly.
        </li>
      </ol>
    </div>
  )
}

function ApiContent() {
  return (
    <div className="flex flex-col gap-3">
      <div className="p-3 rounded-lg" style={{ background: 'rgba(212,176,48,0.08)', border: '1px solid rgba(212,176,48,0.2)' }}>
        <p style={{ color: 'var(--color-text)' }}>
          Only do this if the current key needs to be rotated (e.g. it was exposed somewhere it shouldn&apos;t
          have been) or you&apos;re intentionally starting a fresh Textbelt balance. Otherwise, use{' '}
          <strong>Reload</strong> instead — it&apos;s simpler and keeps everything working without touching any
          configuration.
        </p>
      </div>
      <p>
        Textbelt issues a key per purchase. Getting a genuinely new key generally means completing a new
        purchase at{' '}
        <a href="https://textbelt.com/purchase/" target="_blank" rel="noreferrer" className="underline" style={{ color: 'var(--color-accent)' }}>
          textbelt.com/purchase
        </a>{' '}
        <em>without</em> entering your current key. Their exact self-service flow can change, so check their
        site if this doesn&apos;t match what you see.
      </p>
      <p style={{ color: 'var(--color-text)' }}>Once you have the new key:</p>
      <ol className="space-y-2">
        <li><span className="font-semibold" style={{ color: 'var(--color-text)' }}>1.</span> Update <code>TEXTBELT_API_KEY</code> in your Vercel project&apos;s environment variables.</li>
        <li><span className="font-semibold" style={{ color: 'var(--color-text)' }}>2.</span> Update the same value in your local <code>.env.local</code> so local development matches production.</li>
        <li><span className="font-semibold" style={{ color: 'var(--color-text)' }}>3.</span> Redeploy (Vercel usually redeploys automatically on env var changes — trigger one manually if it doesn&apos;t).</li>
        <li><span className="font-semibold" style={{ color: 'var(--color-text)' }}>4.</span> Come back here and use <strong>Check Balance</strong> to confirm the new key is live and reporting the correct quota.</li>
      </ol>
      <p>
        The old key&apos;s balance doesn&apos;t automatically transfer — make sure it&apos;s actually empty or intentionally
        retired before switching over.
      </p>
    </div>
  )
}

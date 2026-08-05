'use client'

import { useState, useRef, useEffect } from 'react'
import { PAYMENT_ICON_OPTIONS, getPaymentIcon } from '@/lib/payment-icons'

interface Props {
  value: string
  onChange: (key: string) => void
}

/** A native <select> can't render icon components inside its <option> tags —
 *  that's a hard HTML limitation, not a choice — so this is a small popover
 *  grid instead, showing the actual brand mark for the current selection. */
export default function PaymentIconPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = getPaymentIcon(value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        title={current.label}
        className="flex items-center justify-center"
        style={{
          width: '3.5rem', height: '2.5rem',
          background: 'var(--color-bg)', border: '1.5px solid var(--color-border)',
          borderRadius: 8, cursor: 'pointer',
        }}
      >
        <current.Icon size={18} style={{ color: current.color }} />
      </button>

      {open && (
        <div
          className="absolute z-20 mt-1.5 p-2 grid grid-cols-4 gap-1.5"
          style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', width: '11rem',
          }}
        >
          {PAYMENT_ICON_OPTIONS.map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => { onChange(opt.key); setOpen(false) }}
              title={opt.label}
              className="flex items-center justify-center p-2 transition-colors"
              style={{
                background: value === opt.key ? 'var(--color-bg)' : 'transparent',
                border: `1px solid ${value === opt.key ? opt.color : 'transparent'}`,
                borderRadius: 8, cursor: 'pointer',
              }}
            >
              <opt.Icon size={18} style={{ color: opt.color }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

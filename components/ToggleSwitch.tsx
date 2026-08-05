'use client'

import { motion } from 'framer-motion'

interface Props {
  checked: boolean
  onChange: () => void
  activeColor?: string
  label?: string
  disabled?: boolean
}

/** A real switch control — not an icon dressed up as one. Visually reads as
 *  something you click to turn on/off, with a knob that slides. */
export default function ToggleSwitch({ checked, onChange, activeColor = 'var(--r-green)', label, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 46,
        height: 26,
        borderRadius: 999,
        background: checked ? activeColor : 'var(--color-border)',
        position: 'relative',
        border: 'none',
        padding: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.2s ease',
        flexShrink: 0,
      }}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 23 : 3,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
        }}
      />
    </button>
  )
}

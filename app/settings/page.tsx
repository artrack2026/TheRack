'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, Check, Palette, Eye } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import { ThemeColors } from '@/lib/types'

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
]

function isActivePreset(preset: ThemeColors, current: ThemeColors): boolean {
  return (Object.keys(preset) as (keyof ThemeColors)[]).every(
    k => preset[k].toLowerCase() === current[k]?.toLowerCase()
  )
}

export default function SettingsPage() {
  const { colors, setColors, resetColors } = useTheme()
  const [saved, setSaved] = useState(false)

  const updateColor = (key: keyof ThemeColors, value: string) => {
    setColors({ ...colors, [key]: value })
  }

  const applyPreset = (preset: ThemeColors) => {
    setColors(preset)
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-32">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-16"
      >
        <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: 'var(--color-primary)' }}>
          Customize
        </p>
        <h1 className="text-5xl font-black mb-4" style={{ color: 'var(--color-text)' }}>
          Brand Settings
        </h1>
        <div
          className="h-px w-24 mb-6"
          style={{ background: 'linear-gradient(90deg, var(--color-primary), transparent)' }}
        />
        <p className="text-base" style={{ color: 'var(--color-text-muted)' }}>
          Customize the color palette to match your brand. Changes apply instantly and are saved to your browser.
        </p>
      </motion.div>

      {/* Presets */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-12"
      >
        <div className="flex items-center gap-2 mb-6">
          <Palette size={16} style={{ color: 'var(--color-primary)' }} />
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
                className="group p-3 text-left transition-all relative"
                style={{
                  background: preset.colors.surface,
                  border: active
                    ? `2px solid ${preset.colors.primary}`
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
                {active && (
                  <p
                    className="text-xs font-semibold mt-1 tracking-wide"
                    style={{ color: preset.colors.primary }}
                  >
                    Current
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* Custom colors */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-12"
      >
        <div className="flex items-center gap-2 mb-6">
          <Eye size={16} style={{ color: 'var(--color-accent)' }} />
          <h2 className="text-sm tracking-widest uppercase font-bold" style={{ color: 'var(--color-text)' }}>
            Custom Colors
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COLOR_FIELDS.map(({ key, label, desc }) => (
            <div
              key={key}
              className="flex items-center justify-between p-4 gap-4"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold mb-0.5" style={{ color: 'var(--color-text)' }}>
                  {label}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
                <p className="text-xs font-mono mt-1" style={{ color: 'var(--color-primary)' }}>
                  {colors[key]}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className="w-8 h-8 border"
                  style={{ background: colors[key], borderColor: 'var(--color-border)' }}
                />
                <input
                  type="color"
                  value={colors[key]}
                  onChange={e => updateColor(key, e.target.value)}
                  className="w-10 h-10 cursor-pointer border-0 bg-transparent p-0"
                  title={`Pick ${label} color`}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Preview swatch */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mb-12 p-6"
        style={{
          background: colors.background,
          border: `1px solid ${colors.border}`,
        }}
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
      </motion.div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={handleSave}
          className="cyber-btn"
        >
          {saved ? <><Check size={14} /> Saved!</> : 'Save Settings'}
        </button>
        <button
          onClick={resetColors}
          className="flex items-center gap-2 text-sm tracking-widest uppercase px-4 py-2 transition-colors"
          style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
        >
          <RotateCcw size={14} /> Reset to Default
        </button>
      </div>
    </div>
  )
}

import { ThemeColors } from './types'

export const defaultTheme: ThemeColors = {
  background: '#1c1c1a',
  surface:    '#262623',
  primary:    '#c8902a',
  accent:     '#bf5b4a',
  text:       '#eee9e0',
  textMuted:  '#8a8278',
  border:     '#393935',
}

const STORAGE_KEY = 'artrack-theme'

export function loadTheme(): ThemeColors {
  if (typeof window === 'undefined') return defaultTheme
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? { ...defaultTheme, ...JSON.parse(stored) } : defaultTheme
  } catch {
    return defaultTheme
  }
}

export function saveTheme(colors: ThemeColors): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(colors))
}

export function applyTheme(colors: ThemeColors): void {
  const root = document.documentElement
  root.style.setProperty('--color-bg', colors.background)
  root.style.setProperty('--color-surface', colors.surface)
  root.style.setProperty('--color-primary', colors.primary)
  root.style.setProperty('--color-accent', colors.accent)
  root.style.setProperty('--color-text', colors.text)
  root.style.setProperty('--color-text-muted', colors.textMuted)
  root.style.setProperty('--color-border', colors.border)
}

export function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r} ${g} ${b}`
}

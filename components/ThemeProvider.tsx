'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { ThemeColors } from '@/lib/types'
import { defaultTheme, loadTheme, saveTheme, applyTheme } from '@/lib/theme'

interface ThemeContextValue {
  colors: ThemeColors
  setColors: (c: ThemeColors) => void
  resetColors: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: defaultTheme,
  setColors: () => {},
  resetColors: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colors, setColorsState] = useState<ThemeColors>(defaultTheme)

  useEffect(() => {
    const saved = loadTheme()
    setColorsState(saved)
    applyTheme(saved)
  }, [])

  const setColors = (c: ThemeColors) => {
    setColorsState(c)
    saveTheme(c)
    applyTheme(c)
  }

  const resetColors = () => setColors(defaultTheme)

  return (
    <ThemeContext.Provider value={{ colors, setColors, resetColors }}>
      {children}
    </ThemeContext.Provider>
  )
}

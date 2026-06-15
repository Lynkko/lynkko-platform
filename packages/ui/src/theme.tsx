'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'

export interface AppTheme {
  primary:      string
  secondary?:   string
  accent?:      string
  appName?:     string
  logoUrl?:     string
  faviconUrl?:  string
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full'
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_THEME: AppTheme = {
  primary:      '#166534',   // Lynkko green-800
  secondary:    '#0f172a',   // slate-900
  accent:       '#facc15',   // yellow-400
  borderRadius: 'md',
}

// ─── Hex → HSL ────────────────────────────────────────────────────────────────

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6;              break
      case b: h = ((r - g) / d + 4) / 6;              break
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

/** Aclara un color HSL sumando lightness%. */
function lighten(hsl: string, amount: number): string {
  const [h, s, l] = hsl.split(' ')
  const lNum = parseFloat(l)
  return `${h} ${s} ${Math.min(100, lNum + amount)}%`
}

/** Oscurece un color HSL restando lightness%. */
function darken(hsl: string, amount: number): string {
  const [h, s, l] = hsl.split(' ')
  const lNum = parseFloat(l)
  return `${h} ${s} ${Math.max(0, lNum - amount)}%`
}

const RADIUS_MAP = { none: '0px', sm: '4px', md: '8px', lg: '12px', full: '9999px' }

// ─── CSS variable injection ───────────────────────────────────────────────────

function applyTheme(theme: AppTheme, root: HTMLElement) {
  const primary   = hexToHsl(theme.primary)
  const secondary = hexToHsl(theme.secondary ?? DEFAULT_THEME.secondary!)
  const accent    = hexToHsl(theme.accent    ?? DEFAULT_THEME.accent!)

  const isDarkPrimary = parseFloat(primary.split(' ')[2]) < 50

  root.style.setProperty('--primary',            primary)
  root.style.setProperty('--primary-foreground', isDarkPrimary ? '0 0% 100%' : '0 0% 0%')
  root.style.setProperty('--primary-50',         lighten(primary, 45))
  root.style.setProperty('--primary-100',        lighten(primary, 38))
  root.style.setProperty('--primary-200',        lighten(primary, 28))
  root.style.setProperty('--primary-900',        darken(primary,  15))

  root.style.setProperty('--secondary',            secondary)
  root.style.setProperty('--secondary-foreground', '0 0% 100%')

  root.style.setProperty('--accent',            accent)
  root.style.setProperty('--accent-foreground', '0 0% 0%')

  root.style.setProperty('--radius', RADIUS_MAP[theme.borderRadius ?? 'md'])
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ThemeContext = createContext<AppTheme>(DEFAULT_THEME)

export interface ThemeProviderProps {
  theme?:    AppTheme | null
  children:  ReactNode
}

/**
 * Inyecta el tema del tenant como CSS custom properties en el root del DOM.
 * Montar cerca del root de la app, después de obtener el tema del platform.
 *
 * @example
 * // app/layout.tsx
 * import { ThemeProvider } from '@lynkko/ui'
 * import { platform } from '@/lib/platform'
 *
 * export default async function RootLayout({ children }) {
 *   const theme = await platform.getAppTheme(tenantId, 'pec')
 *   return (
 *     <html>
 *       <body>
 *         <ThemeProvider theme={theme}>
 *           {children}
 *         </ThemeProvider>
 *       </body>
 *     </html>
 *   )
 * }
 */
export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  const resolved = theme ?? DEFAULT_THEME

  useEffect(() => {
    applyTheme(resolved, document.documentElement)
  }, [resolved])

  return (
    <ThemeContext.Provider value={resolved}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): AppTheme {
  return useContext(ThemeContext)
}


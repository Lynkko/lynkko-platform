import type { Config } from 'tailwindcss'

/**
 * Preset de Tailwind para Lynkko. Agrega colores semánticos basados en
 * CSS custom properties — el ThemeProvider los inyecta en runtime.
 *
 * @example
 * // tailwind.config.ts de cualquier app Lynkko
 * import { lynkkoPreset } from '@lynkko/ui/tailwind'
 *
 * export default {
 *   presets: [lynkkoPreset],
 *   content: [
 *     './src/**\/*.{ts,tsx}',
 *     './node_modules/@lynkko/ui/dist/**\/*.{js,mjs}',
 *   ],
 * } satisfies Config
 */
export const lynkkoPreset: Config = {
  content: [],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT:    'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
          50:  'hsl(var(--primary-50) / <alpha-value>)',
          100: 'hsl(var(--primary-100) / <alpha-value>)',
          200: 'hsl(var(--primary-200) / <alpha-value>)',
          900: 'hsl(var(--primary-900) / <alpha-value>)',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        border:  'hsl(var(--border) / <alpha-value>)',
        input:   'hsl(var(--input) / <alpha-value>)',
        ring:    'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT:    'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
}

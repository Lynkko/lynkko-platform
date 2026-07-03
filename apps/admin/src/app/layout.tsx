import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ThemeProvider } from '@lynkko/ui'
import '@lynkko/ui/styles.css'
import './globals.css'

type ThemeProviderChildren = Parameters<typeof ThemeProvider>[0]['children']

export const metadata: Metadata = {
  title: 'Lynkko Platform',
  description: 'Administración centralizada del ecosistema Lynkko',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ThemeProvider>{children as ThemeProviderChildren}</ThemeProvider>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import { ThemeProvider } from '@lynkko/ui'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lynkko Platform',
  description: 'Administración centralizada del ecosistema Lynkko',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}

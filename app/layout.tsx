import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pyxis',
  description: 'AI chat assistant powered by multiple models.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#10a37f', secondary: '#2f2f2f' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#2f2f2f' } },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}

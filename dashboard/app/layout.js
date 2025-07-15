import './globals.css'
import { Suspense } from 'react'
import Script from 'next/script'
import ErrorBoundary from '../src/components/ErrorBoundary'

export const metadata = {
  title: 'Ez Aigent Dashboard',
  description: 'AI Multi-Agent SaaS Builder Orchestrator',
  manifest: '/manifest.json',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover'
}

const RootLoading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
)

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//api.openrouter.ai" />
        <link rel="dns-prefetch" href="http://localhost:3000" />
        <meta name="theme-color" content="#3B82F6" />
        <meta name="color-scheme" content="dark light" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ErrorBoundary>
          <Suspense fallback={<RootLoading />}>
            {children}
          </Suspense>
        </ErrorBoundary>
        
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/service-worker.js');
                });
              }
            `,
          }}
        />
        
        <Script
          id="prefetch-data"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('requestIdleCallback' in window) {
                requestIdleCallback(() => {
                  fetch('/api/agents?stats=true', { priority: 'low' });
                  fetch('/api/queue-stats', { priority: 'low' });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
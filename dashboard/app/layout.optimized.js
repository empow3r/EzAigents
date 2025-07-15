import React from 'react';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/src/components/ui/hooks/useTheme';
import { AppProvider } from '@/contexts/AppContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter'
});

export const metadata = {
  title: 'Ez Aigent Command Center',
  description: 'Next-generation AI agent orchestration platform',
  keywords: 'AI, agents, orchestration, automation, dashboard',
  authors: [{ name: 'Ez Aigent Team' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' }
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://ezaigent.com',
    title: 'Ez Aigent Command Center',
    description: 'Next-generation AI agent orchestration platform',
    siteName: 'Ez Aigent',
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'Ez Aigent Dashboard',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ez Aigent Command Center',
    description: 'Next-generation AI agent orchestration platform',
    images: ['/twitter-image.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png' },
    ],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' }
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS Prefetch for API endpoints */}
        <link rel="dns-prefetch" href="https://api.openrouter.ai" />
        
        {/* Performance hints */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        
        {/* PWA meta tags */}
        <meta name="application-name" content="Ez Aigent" />
        <meta name="apple-mobile-web-app-title" content="Ez Aigent" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ErrorBoundary>
          <AppProvider>
            <ThemeProvider defaultTheme="dark">
              {children}
            </ThemeProvider>
          </AppProvider>
        </ErrorBoundary>
        
        {/* Performance monitoring script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Web Vitals reporting
              if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                requestIdleCallback(() => {
                  import('/src/services/performanceMonitor.js').then(({ default: monitor }) => {
                    // Performance monitor will auto-initialize
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
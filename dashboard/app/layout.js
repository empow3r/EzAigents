import './globals.css'

export const metadata = {
  title: 'Ez Aigent Control Panel',
  description: 'Multi-Agent AI Development Dashboard',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
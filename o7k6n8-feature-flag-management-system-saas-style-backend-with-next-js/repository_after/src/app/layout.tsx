import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Feature Flag Management',
  description: 'SaaS-style feature flag management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
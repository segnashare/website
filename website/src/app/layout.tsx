import type {Metadata} from 'next'
import {Playfair_Display} from 'next/font/google'
import './globals.css'

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['800'],
  variable: '--font-playfair-display',
})

export const metadata: Metadata = {
  title: 'Segna Website',
  description: 'Segna marketing site powered by Sanity.',
}

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="fr" className={playfairDisplay.variable}>
      <body>{children}</body>
    </html>
  )
}

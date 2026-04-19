import type {Metadata} from 'next'
import {Playfair_Display} from 'next/font/google'
import {SiteFooter} from '@/components/layout/SiteFooter'
import {getWebsiteFooter} from '@/lib/sanity'
import './globals.css'

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-playfair-display',
})

export const metadata: Metadata = {
  title: 'Segna',
  description: 'Segna marketing site powered by Sanity.',
  icons: {
    icon: '/segna-icon.png',
    shortcut: '/segna-icon.png',
    apple: '/segna-icon.png',
  },
}

export const revalidate = 60

export default async function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  const footer = await getWebsiteFooter()

  return (
    <html lang="fr" className={playfairDisplay.variable}>
      <body>
        {children}
        <SiteFooter data={footer} />
      </body>
    </html>
  )
}

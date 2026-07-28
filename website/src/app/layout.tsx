import type {Metadata} from 'next'
import {Montserrat, Playfair_Display} from 'next/font/google'
import {GoogleAnalyticsHeadScripts} from '@/components/analytics/GoogleAnalytics'
import {PostHogProvider} from '@/components/analytics/PostHogProvider'
import {CookiebotScript} from '@/components/consent/Cookiebot'
import {GoogleConsentModeDefault} from '@/components/consent/GoogleConsentModeDefault'
import {ItemChatShell} from '@/components/item-chat/ItemChatShell'
import {SupabasePublicAuthEnvScript} from '@/components/supabase/SupabasePublicAuthEnvScript'
import './globals.css'

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-playfair-display',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-montserrat',
})

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.segnashare.com').replace(/\/+$/, '')

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Segna',
  description: 'Segna marketing site powered by Sanity.',
  icons: {
    icon: '/segna-icon.png',
    shortcut: '/segna-icon.png',
    apple: '/segna-icon.png',
  },
}

export const revalidate = 3600

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="fr" className={`${playfairDisplay.variable} ${montserrat.variable}`}>
      <head>
        <GoogleConsentModeDefault />
        <CookiebotScript />
        <GoogleAnalyticsHeadScripts />
      </head>
      <body>
        <SupabasePublicAuthEnvScript />
        <PostHogProvider>
          <ItemChatShell>{children}</ItemChatShell>
        </PostHogProvider>
      </body>
    </html>
  )
}

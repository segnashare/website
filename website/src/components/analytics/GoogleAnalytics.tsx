'use client'

import Script from 'next/script'
import {useEffect, useState} from 'react'

/** ID public GA4 Segna Website (segnashare.com). Surchargeable via env sur Vercel. */
export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || 'G-BMMCB64037'

type CookiebotConsent = {
  statistics?: boolean
}

type CookiebotApi = {
  consent?: CookiebotConsent
}

function hasStatisticsConsent(): boolean {
  if (typeof window === 'undefined') return false
  const cookiebot = (window as Window & {Cookiebot?: CookiebotApi}).Cookiebot
  return Boolean(cookiebot?.consent?.statistics)
}

/**
 * GA4 uniquement après consentement Cookiebot « statistics ».
 * Évite de charger gtag avant le CMP (scan Cookiebot / Next chunks avant uc.js).
 * Consent Mode v2 reste « denied » via GoogleConsentModeDefault jusqu’à acceptation.
 */
export function GoogleAnalyticsHeadScripts() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return

    const sync = () => setEnabled(hasStatisticsConsent())

    const onDecline = () => {
      setEnabled(false)
      const w = window as Window & {gtag?: (...args: unknown[]) => void}
      w.gtag?.('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      })
    }

    sync()
    window.addEventListener('CookiebotOnAccept', sync)
    window.addEventListener('CookiebotOnDecline', onDecline)
    window.addEventListener('CookiebotOnConsentReady', sync)

    return () => {
      window.removeEventListener('CookiebotOnAccept', sync)
      window.removeEventListener('CookiebotOnDecline', onDecline)
      window.removeEventListener('CookiebotOnConsentReady', sync)
    }
  }, [])

  if (!GA_MEASUREMENT_ID || !enabled) return null

  return (
    <>
      <Script
        id="ga4-gtag-src"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-gtag-config" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  )
}

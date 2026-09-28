'use client'

import Script from 'next/script'
import {Suspense, useEffect, useRef, useState} from 'react'
import {usePathname, useSearchParams} from 'next/navigation'

/** ID public Meta Pixel (segnashare.com). Surchargeable via env sur Vercel. */
export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || '1076520028563557'

type CookiebotConsent = {
  marketing?: boolean
}

type CookiebotApi = {
  consent?: CookiebotConsent
}

type Fbq = ((...args: unknown[]) => void) & {loaded?: boolean}

function hasMarketingConsent(): boolean {
  if (typeof window === 'undefined') return false
  const cookiebot = (window as Window & {Cookiebot?: CookiebotApi}).Cookiebot
  return Boolean(cookiebot?.consent?.marketing)
}

function getFbq(): Fbq | undefined {
  return (window as Window & {fbq?: Fbq}).fbq
}

/**
 * PageView sur les navigations client. Le premier hit est envoyé par le snippet
 * au chargement du script, pour ne pas le doubler.
 */
function MetaPixelPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const skipInitial = useRef(true)

  useEffect(() => {
    if (!pathname) return
    if (skipInitial.current) {
      skipInitial.current = false
      return
    }
    getFbq()?.('track', 'PageView')
  }, [pathname, searchParams])

  return null
}

/**
 * Meta Pixel uniquement après consentement Cookiebot « marketing ».
 * Le pixel n’est pas injecté tant que le visiteur n’a pas accepté les cookies marketing.
 */
export function MetaPixel() {
  const [enabled, setEnabled] = useState(false)
  const wasRevoked = useRef(false)

  useEffect(() => {
    if (!META_PIXEL_ID) return

    const sync = () => {
      const allowed = hasMarketingConsent()
      setEnabled(allowed)
      const fbq = getFbq()
      if (!allowed) {
        if (fbq) {
          fbq('consent', 'revoke')
          wasRevoked.current = true
        }
        return
      }
      // Premier accord : le snippet envoie le PageView. On ne le renvoie qu’après un refus.
      if (fbq && wasRevoked.current) {
        fbq('consent', 'grant')
        fbq('track', 'PageView')
        wasRevoked.current = false
      }
    }

    sync()
    window.addEventListener('CookiebotOnAccept', sync)
    window.addEventListener('CookiebotOnDecline', sync)
    window.addEventListener('CookiebotOnConsentReady', sync)

    return () => {
      window.removeEventListener('CookiebotOnAccept', sync)
      window.removeEventListener('CookiebotOnDecline', sync)
      window.removeEventListener('CookiebotOnConsentReady', sync)
    }
  }, [])

  if (!META_PIXEL_ID || !enabled) return null

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <Suspense fallback={null}>
        <MetaPixelPageView />
      </Suspense>
    </>
  )
}

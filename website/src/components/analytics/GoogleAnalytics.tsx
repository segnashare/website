import Script from 'next/script'

/** ID public GA4 Segna Website (segnashare.com). Surchargeable via env sur Vercel. */
export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || 'G-BMMCB64037'

/**
 * GA4 après Cookiebot : `afterInteractive` pour que l’autoblocker puisse
 * différer l’exécution jusqu’au consentement statistics.
 * @see https://support.cookiebot.com/hc/en-us/articles/27408568285212
 */
export function GoogleAnalyticsHeadScripts() {
  if (!GA_MEASUREMENT_ID) return null

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

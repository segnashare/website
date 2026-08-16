import Script from 'next/script'

const COOKIEBOT_CBID =
  process.env.NEXT_PUBLIC_COOKIEBOT_CBID?.trim() || '3daff10a-7d1c-40b9-a577-c958419ad47a'

/**
 * Bannière Cookiebot — root layout only, `beforeInteractive`, sans async/defer.
 * Doit suivre Consent Mode et précéder gtag (autoblocking).
 * @see https://support.cookiebot.com/hc/en-us/articles/27408568285212
 */
export function CookiebotScript() {
  if (!COOKIEBOT_CBID) return null

  return (
    <Script
      id="Cookiebot"
      src="https://consent.cookiebot.com/uc.js"
      data-cbid={COOKIEBOT_CBID}
      data-blockingmode="auto"
      strategy="beforeInteractive"
    />
  )
}

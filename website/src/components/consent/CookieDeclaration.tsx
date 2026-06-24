import Script from 'next/script'

const COOKIEBOT_CBID =
  process.env.NEXT_PUBLIC_COOKIEBOT_CBID?.trim() || '3daff10a-7d1c-40b9-a577-c958419ad47a'

/** Tableau Cookiebot injecté à l’emplacement du composant (page déclaration de cookies). */
export function CookieDeclaration() {
  if (!COOKIEBOT_CBID) return null

  return (
    <Script
      id="CookieDeclaration"
      src={`https://consent.cookiebot.com/${COOKIEBOT_CBID}/cd.js`}
      strategy="afterInteractive"
    />
  )
}

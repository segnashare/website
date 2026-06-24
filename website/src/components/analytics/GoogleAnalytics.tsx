/** ID public GA4 Segna Website (segnashare.com). Surchargeable via env sur Vercel. */
export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || 'G-BMMCB64037'

export function GoogleAnalyticsHeadScripts() {
  if (!GA_MEASUREMENT_ID) return null

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-sync-scripts -- requis par GA : visible dans le HTML initial pour le test Google */}
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `,
        }}
      />
    </>
  )
}

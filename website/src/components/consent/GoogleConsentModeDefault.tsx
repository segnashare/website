import Script from 'next/script'

/**
 * Consent Mode v2 — defaults « denied » avant Cookiebot / gtag.
 * `data-cookieconsent="ignore"` : ne pas laisser l’autoblocker bloquer ce script.
 * `beforeInteractive` : doit tourner avant tout tag Google.
 */
export function GoogleConsentModeDefault() {
  return (
    <Script
      id="google-consent-default"
      strategy="beforeInteractive"
      data-cookieconsent="ignore"
      dangerouslySetInnerHTML={{
        __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            ad_personalization: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            analytics_storage: 'denied',
            functionality_storage: 'denied',
            personalization_storage: 'denied',
            security_storage: 'granted',
            wait_for_update: 500,
          });
          gtag('set', 'ads_data_redaction', true);
          gtag('set', 'url_passthrough', false);
        `,
      }}
    />
  )
}

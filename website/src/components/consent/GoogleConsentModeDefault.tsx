/** Consent Mode v2 — valeurs par défaut « denied » avant Cookiebot et gtag (data-cookieconsent="ignore"). */
export function GoogleConsentModeDefault() {
  return (
    <script
      // Cookiebot peut muter / retirer data-cookieconsent avant l’hydratation React.
      suppressHydrationWarning
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

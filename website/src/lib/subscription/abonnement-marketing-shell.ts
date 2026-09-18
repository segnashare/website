import {cache} from 'react'
import {
  getHomePageData,
  getMarketingPageBySlug,
  getWebsiteHeaderNav,
  type MarketingPageData,
  type PageSection,
} from '@/lib/sanity'
import {SANITY_CACHE_TAG, withDataCache} from '@/lib/sanity-cache'
import {resolveMarketingCtaHref, resolveMarketingCtaLabel, resolveMarketingPromoCopy} from '@/lib/marketing-cta'

/** Fallback si la page Sanity `abonnement` n’existe pas encore. */
export const ABONNEMENT_FALLBACK_MARKETING: MarketingPageData = {
  _id: 'fallback-abonnement',
  title: 'Abonnement',
  slug: {current: 'abonnement'},
  heroTitle: 'Louer avec SegnaX',
  heroSubtitle:
    '40 €/mois — jusqu’à 400 € de pièces, échanges et assurance inclus.',
  heroPresentation: 'single_photo',
  heroCtaLabel: 'Essayer SegnaX dès 40€/mois',
  heroCtaHref: '#offre-segnax',
}

async function getAbonnementMarketingShellUncached() {
  const [marketingFromCms, homePage, siteNavFallback] = await Promise.all([
    getMarketingPageBySlug('abonnement'),
    getHomePageData(),
    getWebsiteHeaderNav(),
  ])

  const marketingPage = marketingFromCms ?? ABONNEMENT_FALLBACK_MARKETING
  const headerNav = homePage ?? siteNavFallback
  const fromCms = Boolean(marketingFromCms)

  const customCtaLabel = resolveMarketingCtaLabel(marketingPage.heroCtaLabel)
  const customCtaHref = resolveMarketingCtaHref(marketingPage.heroCtaHref, customCtaLabel)
  const customCta =
    customCtaLabel && customCtaHref ? {label: customCtaLabel, href: customCtaHref} : null

  const cta = customCta ?? {
    label: 'Essayer SegnaX dès 40€/mois',
    href: '#offre-segnax',
  }

  const sections: PageSection[] = marketingPage.sections ?? []
  const marketingPageResolved: MarketingPageData = {
    ...marketingPage,
    heroSubtitle: resolveMarketingPromoCopy(marketingPage.heroSubtitle) ?? marketingPage.heroSubtitle,
    heroCtaLabel: cta.label,
  }

  return {marketingPage: marketingPageResolved, headerNav, cta, sections, fromCms}
}

/** Hero + sections page marketing « abonnement » (comme Location / Catalogue). */
export const getAbonnementMarketingShell = cache(
  withDataCache(getAbonnementMarketingShellUncached, ['abonnement_marketing_shell_v3'], {
    revalidate: 3600,
    tags: [SANITY_CACHE_TAG],
  }),
)

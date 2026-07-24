import {cache} from 'react'
import {
  getHomePageData,
  getMarketingPageBySlug,
  getWebsiteHeaderNav,
  type MarketingPageData,
  type PageSection,
} from '@/lib/sanity'
import {SANITY_CACHE_TAG, withDataCache} from '@/lib/sanity-cache'

/** Fallback si la page Sanity `abonnement` n’existe pas encore. */
export const ABONNEMENT_FALLBACK_MARKETING: MarketingPageData = {
  _id: 'fallback-abonnement',
  title: 'Abonnement',
  slug: {current: 'abonnement'},
  heroTitle: 'Louer avec SegnaX',
  heroSubtitle:
    '1er mois gratuit, puis 39,99 €/mois — jusqu’à 400 € de pièces, échanges et assurance inclus.',
  heroPresentation: 'single_photo',
  heroCtaLabel: 'Commencer — 1er mois gratuit',
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

  const customCta =
    marketingPage.heroCtaLabel?.trim() && marketingPage.heroCtaHref?.trim()
      ? {label: marketingPage.heroCtaLabel.trim(), href: marketingPage.heroCtaHref.trim()}
      : null

  const cta = customCta ?? {
    label: 'Commencer — 1er mois gratuit',
    href: '#offre-segnax',
  }

  const sections: PageSection[] = marketingPage.sections ?? []

  return {marketingPage, headerNav, cta, sections, fromCms}
}

/** Hero + sections page marketing « abonnement » (comme Location / Catalogue). */
export const getAbonnementMarketingShell = cache(
  withDataCache(getAbonnementMarketingShellUncached, ['abonnement_marketing_shell_v2'], {
    revalidate: 3600,
    tags: [SANITY_CACHE_TAG],
  }),
)

import {cache} from 'react'
import {getHomePageData, getMarketingPageBySlug, getWebsiteHeaderNav} from '@/lib/sanity'
import {SANITY_CACHE_TAG, withDataCache} from '@/lib/sanity-cache'
import {CATALOG_ISR_REVALIDATE_SEC} from '@/lib/catalog/catalog-cache'
import type {PageSection} from '@/lib/sanity'

function withoutDbCatalogSections(sections: PageSection[] | null | undefined): PageSection[] {
  if (!sections?.length) return []
  return sections.filter((s) => s._type !== 'websiteDbCatalogSection')
}

async function getCatalogueMarketingShellUncached() {
  const [marketingPage, homePage, siteNavFallback] = await Promise.all([
    getMarketingPageBySlug('catalogue'),
    getHomePageData(),
    getWebsiteHeaderNav(),
  ])

  const headerNav = homePage ?? siteNavFallback

  const customCta =
    marketingPage?.heroCtaLabel?.trim() && marketingPage?.heroCtaHref?.trim()
      ? {label: marketingPage.heroCtaLabel.trim(), href: marketingPage.heroCtaHref.trim()}
      : null

  const primary = homePage?.primaryCta ?? siteNavFallback?.primaryCta
  const fallbackCta =
    primary?.label?.trim() && primary?.url?.trim()
      ? {label: primary.label.trim(), href: primary.url.trim()}
      : {label: 'Découvrir Segna', href: '/'}

  const cta = customCta ?? fallbackCta
  const sections = withoutDbCatalogSections(marketingPage?.sections)

  return {marketingPage, headerNav, cta, sections}
}

/** Données hero + sections page marketing « catalogue » (cache 1h entre requêtes). */
export const getCatalogueMarketingShell = cache(
  withDataCache(getCatalogueMarketingShellUncached, ['catalogue_marketing_shell_v1'], {
    revalidate: CATALOG_ISR_REVALIDATE_SEC,
    tags: [SANITY_CACHE_TAG],
  }),
)

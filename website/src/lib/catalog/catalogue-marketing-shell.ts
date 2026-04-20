import {cache} from 'react'
import {getHomePageData, getMarketingPageBySlug, getWebsiteHeaderNav} from '@/lib/sanity'
import type {PageSection} from '@/lib/sanity'

function withoutDbCatalogSections(sections: PageSection[] | null | undefined): PageSection[] {
  if (!sections?.length) return []
  return sections.filter((s) => s._type !== 'websiteDbCatalogSection')
}

/** Données hero + sections page marketing « catalogue » (une requête dédupliquée par navigation). */
export const getCatalogueMarketingShell = cache(async () => {
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
})

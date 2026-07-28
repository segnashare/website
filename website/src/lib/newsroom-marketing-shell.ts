import {cache} from 'react'
import {
  getHomePageData,
  getMarketingPageBySlug,
  getNewsroomPageData,
  getWebsiteHeaderNav,
  type MarketingPageData,
  type PageSection,
  type WebsiteHeaderNavData,
} from '@/lib/sanity'
import {CMS_ISR_REVALIDATE_SEC, SANITY_CACHE_TAG, withDataCache} from '@/lib/sanity-cache'

export type NewsroomMarketingShell = {
  marketing: MarketingPageData
  headerNav: WebsiteHeaderNavData | null
  cta: {label: string; href: string}
  sections: PageSection[]
  introText?: string
}

async function getNewsroomMarketingShellUncached(): Promise<NewsroomMarketingShell> {
  const [newsroomPage, cataloguePage, homePage, siteNavFallback] = await Promise.all([
    getNewsroomPageData(),
    getMarketingPageBySlug('catalogue'),
    getHomePageData(),
    getWebsiteHeaderNav(),
  ])

  const headerNav = homePage ?? siteNavFallback

  const customCta =
    newsroomPage?.heroCtaLabel?.trim() && newsroomPage?.heroCtaHref?.trim()
      ? {label: newsroomPage.heroCtaLabel.trim(), href: newsroomPage.heroCtaHref.trim()}
      : null

  const primary = homePage?.primaryCta ?? siteNavFallback?.primaryCta
  const fallbackCta =
    primary?.label?.trim() && primary?.url?.trim()
      ? {label: primary.label.trim(), href: primary.url.trim()}
      : {label: 'Découvrir Segna', href: '/location'}

  const cta = customCta ?? fallbackCta

  const ownStates = newsroomPage?.heroStates ?? []
  const hasOwnMulti = newsroomPage?.heroPresentation === 'multi_state' && ownStates.length > 0
  const catalogueStates = cataloguePage?.heroStates ?? []
  const useCatalogueVisual =
    !hasOwnMulti &&
    cataloguePage?.heroPresentation === 'multi_state' &&
    catalogueStates.length > 0

  const marketing: MarketingPageData = {
    _id: newsroomPage?._id ?? 'newsroom',
    title: 'Newsroom',
    slug: {current: 'newsroom'},
    heroTitle: newsroomPage?.heroTitle?.trim() || 'Newsroom',
    heroSubtitle: newsroomPage?.heroSubtitle?.trim() || undefined,
    heroCtaLabel: newsroomPage?.heroCtaLabel,
    heroCtaHref: newsroomPage?.heroCtaHref,
    heroPresentation: hasOwnMulti || useCatalogueVisual ? 'multi_state' : newsroomPage?.heroPresentation || 'single_photo',
    heroStageTransitionMs:
      newsroomPage?.heroStageTransitionMs ?? cataloguePage?.heroStageTransitionMs ?? 650,
    heroStates: hasOwnMulti ? ownStates : useCatalogueVisual ? catalogueStates : ownStates,
    heroImage: newsroomPage?.heroImage ?? cataloguePage?.heroImage,
    sections: newsroomPage?.sections,
    seo: newsroomPage?.seo,
  }

  return {
    marketing,
    headerNav,
    cta,
    sections: newsroomPage?.sections ?? [],
    introText: newsroomPage?.introText?.trim() || undefined,
  }
}

/** Hero plein écran newsroom (même composant que le catalogue). */
export const getNewsroomMarketingShell = cache(
  withDataCache(getNewsroomMarketingShellUncached, ['newsroom_marketing_shell_v1'], {
    revalidate: CMS_ISR_REVALIDATE_SEC,
    tags: [SANITY_CACHE_TAG],
  }),
)

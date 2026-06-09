import type {HomePageDocumentData} from '@/lib/sanity'

export type HeroActionLayout = 'search_only' | 'single_cta' | 'cta_and_search' | 'dual_cta'

export type HeroCta = {label: string; href: string}

export type HomeHeroAction = {
  layout: HeroActionLayout
  primaryCta: HeroCta | null
  secondaryCta: HeroCta | null
  ctaPosition: 'left' | 'right'
  showSearch: boolean
}

type PageHeroActionFields = Pick<
  HomePageDocumentData,
  | 'heroActionLayout'
  | 'heroCtaLabel'
  | 'heroCtaHref'
  | 'heroCtaPosition'
  | 'heroSecondaryCtaLabel'
  | 'heroSecondaryCtaHref'
>

function ctaPair(label?: string, href?: string): HeroCta | null {
  const l = label?.trim()
  const h = href?.trim()
  return l && h ? {label: l, href: h} : null
}

function resolveLayout(page: PageHeroActionFields): HeroActionLayout {
  if (page.heroActionLayout) return page.heroActionLayout
  const primary = ctaPair(page.heroCtaLabel, page.heroCtaHref)
  const secondary = ctaPair(page.heroSecondaryCtaLabel, page.heroSecondaryCtaHref)
  if (primary && secondary) return 'dual_cta'
  if (primary) return 'cta_and_search'
  return 'search_only'
}

export function homeHeroActionFromPage(page: PageHeroActionFields): HomeHeroAction {
  const layout = resolveLayout(page)
  const primaryCta = ctaPair(page.heroCtaLabel, page.heroCtaHref)
  const secondaryCta = ctaPair(page.heroSecondaryCtaLabel, page.heroSecondaryCtaHref)
  const ctaPosition = page.heroCtaPosition === 'left' ? 'left' : 'right'

  const showSearch = layout === 'search_only' || layout === 'cta_and_search'

  return {
    layout,
    primaryCta,
    secondaryCta,
    ctaPosition,
    showSearch,
  }
}

/** @deprecated Utiliser `homeHeroActionFromPage`. */
export function homeHeroCtaFromPage(
  page: Pick<HomePageDocumentData, 'heroCtaLabel' | 'heroCtaHref' | 'heroCtaPosition'>,
): {label: string; href: string; position: 'left' | 'right'} | null {
  const action = homeHeroActionFromPage(page)
  if (!action.primaryCta || action.layout === 'search_only' || action.layout === 'dual_cta') {
    return null
  }
  return {...action.primaryCta, position: action.ctaPosition}
}

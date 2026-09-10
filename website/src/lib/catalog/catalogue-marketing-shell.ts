import {cache} from 'react'
import {
  getCollectionPageData,
  getHomePageData,
  getMarketingPageBySlug,
  getWebsiteHeaderNav,
  urlFor,
  type CollectionPageData,
  type CollectionTargetingLook,
  type MarketingPageData,
  type PageSection,
  type SeoMetadata,
} from '@/lib/sanity'
import {SANITY_CACHE_TAG, withDataCache} from '@/lib/sanity-cache'
import {CATALOG_CACHE_TAG, CATALOG_ISR_REVALIDATE_SEC} from '@/lib/catalog/catalog-cache'
import {
  collectionLookSlugFromTitle,
  type CollectionTargetingLookView,
} from '@/lib/catalog/catalog-collection-looks'
import {objectPositionFromHotspot} from '@/lib/homeStagedPlacements'
import {slugifyFr} from '@/lib/catalog/catalog-slugs'
import {heroTitlePlainText} from '@/lib/hero-title'

function withoutDbCatalogSections(sections: PageSection[] | null | undefined): PageSection[] {
  if (!sections?.length) return []
  return sections.filter((s) => s._type !== 'websiteDbCatalogSection')
}

function asSlugList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return [
    ...new Set(
      raw
        .map((s) => (typeof s === 'string' ? slugifyFr(s) : ''))
        .filter((s) => s && s !== 'x'),
    ),
  ]
}

function seoHasContent(seo: SeoMetadata | null | undefined): boolean {
  if (!seo) return false
  if (seo.metaTitle?.trim() || seo.metaDescription?.trim()) return true
  const share = seo.shareImage
  return Boolean(share?.asset && (share.asset._ref || share.asset.url))
}

function mapCollectionTargetingLooks(
  rows: CollectionTargetingLook[] | null | undefined,
): CollectionTargetingLookView[] {
  if (!rows?.length) return []
  const used = new Set<string>()
  const out: CollectionTargetingLookView[] = []
  for (const row of rows) {
    const title = row.title?.trim()
    if (!title) continue
    const key = row._key?.trim() || `look-${out.length}`
    const fromCms = typeof row.slug === 'string' ? slugifyFr(row.slug) : ''
    let slug = fromCms && fromCms !== 'x' ? fromCms : collectionLookSlugFromTitle(title, key)
    if (used.has(slug)) slug = `${slug}-${key.slice(0, 6)}`
    used.add(slug)

    const asset = row.image?.asset
    const hasImage = Boolean(asset && (asset._ref || asset._id || asset.url) && row.image)
    const imageUrl = hasImage && row.image
      ? urlFor(row.image).width(720).height(960).fit('crop').auto('format').quality(85).url()
      : null

    out.push({
      key,
      title,
      slug,
      subtitle: row.subtitle?.trim() || null,
      imageUrl,
      imageAlt: row.image?.alt?.trim() || title,
      objectPosition: objectPositionFromHotspot(row.image?.hotspot),
      categorySlugs: asSlugList(row.categorySlugs),
      brandSlugs: asSlugList(row.brandSlugs),
      colorSlugs: asSlugList(row.colorSlugs),
      materialSlugs: asSlugList(row.materialSlugs),
      tagSlugs: asSlugList(row.tagSlugs),
      newOnly: Boolean(row.newOnly),
    })
  }
  return out
}

function coalesceCatalogueContent(
  collectionPage: CollectionPageData | null,
  marketingPage: MarketingPageData | null,
) {
  const fromCollection = mapCollectionTargetingLooks(collectionPage?.collectionTargeting)
  const targetingLooks =
    fromCollection.length > 0
      ? fromCollection
      : mapCollectionTargetingLooks(marketingPage?.collectionTargeting)

  const collectionSections = withoutDbCatalogSections(collectionPage?.sections)
  const sections =
    collectionSections.length > 0
      ? collectionSections
      : withoutDbCatalogSections(marketingPage?.sections)

  const seo = seoHasContent(collectionPage?.seo) ? collectionPage?.seo ?? null : marketingPage?.seo ?? null
  const title =
    seo?.metaTitle?.trim() ||
    marketingPage?.title?.trim() ||
    heroTitlePlainText(marketingPage?.heroTitle) ||
    'Collection'
  const description =
    seo?.metaDescription?.trim() || marketingPage?.heroSubtitle?.trim() || undefined

  return {targetingLooks, sections, seo, title, description}
}

async function getCatalogueMarketingShellUncached() {
  const [collectionPage, marketingPage, homePage, siteNavFallback] = await Promise.all([
    getCollectionPageData(),
    getMarketingPageBySlug('catalogue'),
    getHomePageData(),
    getWebsiteHeaderNav(),
  ])

  const headerNav = homePage ?? siteNavFallback
  const content = coalesceCatalogueContent(collectionPage, marketingPage)

  return {headerNav, collectionPage, ...content}
}

/** Nav + ciblage CMS + sections page Collection (cache 1h). */
export const getCatalogueMarketingShell = cache(
  withDataCache(getCatalogueMarketingShellUncached, ['catalogue_marketing_shell_v3'], {
    revalidate: CATALOG_ISR_REVALIDATE_SEC,
    tags: [CATALOG_CACHE_TAG, SANITY_CACHE_TAG],
  }),
)

import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import {DEFAULT_CATALOG_BROWSE_QUERY} from '@/lib/catalog/catalog-browse-defaults'
import {slugifyFr} from '@/lib/catalog/catalog-slugs'
import type {CatalogSortMode} from '@/lib/catalog/marketing-catalog-items'

/** Ciblage éditorial (CMS) pour la frame en haut de /catalogue. */
export type CollectionTargetingLookView = {
  key: string
  title: string
  slug: string
  subtitle: string | null
  imageUrl: string | null
  imageAlt: string | null
  objectPosition: string | undefined
  categorySlugs: string[]
  brandSlugs: string[]
  colorSlugs: string[]
  materialSlugs: string[]
  tagSlugs: string[]
  newOnly: boolean
}

function sorted(slugs: readonly string[]): string[] {
  return [...new Set(slugs.filter((s) => typeof s === 'string' && s.trim()))].sort()
}

export function queryFromCollectionLook(
  look: CollectionTargetingLookView,
  sort: CatalogSortMode,
): CatalogBrowseQuery {
  const tagSlugs = sorted(look.tagSlugs)
  return {
    ...DEFAULT_CATALOG_BROWSE_QUERY,
    sort,
    page: 1,
    categorySlugs: sorted(look.categorySlugs),
    brandSlugs: sorted(look.brandSlugs),
    colorSlugs: sorted(look.colorSlugs),
    materialSlugs: sorted(look.materialSlugs),
    tagSlugs,
    tagSlug: tagSlugs[0] ?? null,
    newOnly: Boolean(look.newOnly),
    lookSlug: look.slug,
    segmentSlug: null,
    subSlug: null,
    sizeSlugs: [],
    availabilitySlugs: [],
  }
}

function slugsEqual(a: readonly string[], b: readonly string[]): boolean {
  return sorted(a).join(',') === sorted(b).join(',')
}

/** Filtres du look (hors page / tri / lookSlug). */
export function lookFiltersMatchQuery(look: CollectionTargetingLookView, query: CatalogBrowseQuery): boolean {
  const queryTags = query.tagSlugs.length > 0 ? query.tagSlugs : query.tagSlug ? [query.tagSlug] : []
  return (
    Boolean(look.newOnly) === Boolean(query.newOnly) &&
    slugsEqual(look.categorySlugs, query.categorySlugs) &&
    slugsEqual(look.brandSlugs, query.brandSlugs) &&
    slugsEqual(look.colorSlugs, query.colorSlugs) &&
    slugsEqual(look.materialSlugs, query.materialSlugs ?? []) &&
    slugsEqual(look.tagSlugs, queryTags) &&
    (query.sizeSlugs?.length ?? 0) === 0 &&
    (query.availabilitySlugs?.length ?? 0) === 0
  )
}

export function selectedCollectionLook(
  looks: readonly CollectionTargetingLookView[],
  query: CatalogBrowseQuery,
): CollectionTargetingLookView | null {
  if (looks.length === 0) return null
  const lookSlug = query.lookSlug?.trim()
  if (lookSlug) {
    const bySlug = looks.find((l) => l.slug === lookSlug)
    if (bySlug && lookFiltersMatchQuery(bySlug, query)) return bySlug
  }
  return looks.find((l) => lookFiltersMatchQuery(l, query)) ?? null
}

export function collectionLookSlugFromTitle(title: string, fallback: string): string {
  const slug = slugifyFr(title)
  return slug && slug !== 'x' ? slug : fallback
}

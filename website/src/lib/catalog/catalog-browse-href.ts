import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import {mergePathAndQuery} from '@/lib/catalog/catalog-search-params'
import type {CatalogSortMode} from '@/lib/catalog/marketing-catalog-items'
import type {MarketingCatalogCategoryNavOption} from '@/lib/catalog/marketing-catalog-items'
import type {MarketingCatalogFacetsNav} from '@/lib/catalog/marketing-catalog-items'
import {
  catalogBrandCategorySecondSegment,
  type CatalogPathResolved,
} from '@/lib/catalog/catalog-path-resolve'
import {DEFAULT_CATALOG_BROWSE_QUERY} from '@/lib/catalog/catalog-browse-defaults'
import {
  effectiveCategorySlugs,
  queryWithCategorySlugs,
  toggleCategorySlugs,
} from '@/lib/catalog/catalog-category-selection'

const CATALOG_PATH = '/catalogue'

function emptyBrowseQuery(): CatalogBrowseQuery {
  return {...DEFAULT_CATALOG_BROWSE_QUERY}
}

export function catalogBrowseWithSegments(
  base: CatalogBrowseQuery,
  segmentSlug: string | null,
  subSlug: string | null,
): string {
  return mergePathAndQuery(CATALOG_PATH, {
    ...base,
    page: 1,
    segmentSlug,
    subSlug,
  })
}

/** Filtre marque / catégorie sur `/catalogue` uniquement (query `segment` + `categorie`). */
export function catalogBrowsePath(brandSlug: string | null, categorySlug: string | null): string {
  if (brandSlug && categorySlug) {
    return catalogBrowseWithSegments(emptyBrowseQuery(), brandSlug, categorySlug)
  }
  if (brandSlug) {
    return catalogBrowseWithSegments(emptyBrowseQuery(), brandSlug, null)
  }
  if (categorySlug) {
    return catalogBrowseWithSegments(emptyBrowseQuery(), categorySlug, null)
  }
  return CATALOG_PATH
}

/** Sélection « New » (badge nouveautés). */
export function catalogBrowseNewHref(): string {
  return mergePathAndQuery(CATALOG_PATH, {...emptyBrowseQuery(), newOnly: true})
}

/** Sélection par tag catalogue (`?tag=summer2026`). */
export function catalogBrowseTagHref(tagSlug: string): string {
  const slug = tagSlug.trim()
  if (!slug) return CATALOG_PATH
  return mergePathAndQuery(CATALOG_PATH, {...emptyBrowseQuery(), tagSlug: slug})
}

export function withSort(base: CatalogBrowseQuery, sort: CatalogSortMode): string {
  return mergePathAndQuery(CATALOG_PATH, {...base, sort, page: 1})
}

export function toggleColorHref(base: CatalogBrowseQuery, colorSlug: string): string {
  const set = new Set(base.colorSlugs)
  if (set.has(colorSlug)) set.delete(colorSlug)
  else set.add(colorSlug)
  return mergePathAndQuery(CATALOG_PATH, {
    ...base,
    page: 1,
    colorSlugs: [...set].sort(),
  })
}

export function toggleSizeHref(base: CatalogBrowseQuery, sizeSlug: string): string {
  const set = new Set(base.sizeSlugs)
  if (set.has(sizeSlug)) set.delete(sizeSlug)
  else set.add(sizeSlug)
  return mergePathAndQuery(CATALOG_PATH, {
    ...base,
    page: 1,
    sizeSlugs: [...set].sort(),
  })
}

export function toggleAvailabilityHref(base: CatalogBrowseQuery, availabilitySlug: string): string {
  const set = new Set(base.availabilitySlugs)
  if (set.has(availabilitySlug)) set.delete(availabilitySlug)
  else set.add(availabilitySlug)
  return mergePathAndQuery(CATALOG_PATH, {
    ...base,
    page: 1,
    availabilitySlugs: [...set].sort(),
  })
}

export function pageHref(base: CatalogBrowseQuery, page: number): string {
  return mergePathAndQuery(CATALOG_PATH, {...base, page})
}

export function categoriesAllHref(query: CatalogBrowseQuery, facets: MarketingCatalogFacetsNav): string {
  return mergePathAndQuery(CATALOG_PATH, queryWithCategorySlugs(query, facets, []))
}

export function toggleCategoryHref(
  query: CatalogBrowseQuery,
  cat: MarketingCatalogCategoryNavOption,
  facets: MarketingCatalogFacetsNav,
): string {
  const current = effectiveCategorySlugs(query, facets)
  const next = toggleCategorySlugs(current, cat, facets.categories)
  return mergePathAndQuery(CATALOG_PATH, queryWithCategorySlugs(query, facets, next))
}

export function brandItemHref(
  resolved: CatalogPathResolved,
  brandSlug: string,
  query: CatalogBrowseQuery,
  facets: MarketingCatalogFacetsNav,
): string {
  const cats = effectiveCategorySlugs(query, facets)
  if (cats.length > 0) {
    return mergePathAndQuery(CATALOG_PATH, {
      ...queryWithCategorySlugs(query, facets, cats),
      segmentSlug: brandSlug,
    })
  }
  const second = catalogBrandCategorySecondSegment(resolved)
  if (second) return catalogBrowseWithSegments(query, brandSlug, second)
  return catalogBrowseWithSegments(query, brandSlug, null)
}

export function marquesResetHref(
  query: CatalogBrowseQuery,
  facets: MarketingCatalogFacetsNav,
): string {
  return mergePathAndQuery(CATALOG_PATH, {
    ...queryWithCategorySlugs(query, facets, effectiveCategorySlugs(query, facets)),
    segmentSlug: null,
  })
}

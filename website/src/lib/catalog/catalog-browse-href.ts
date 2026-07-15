import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import {mergePathAndQuery} from '@/lib/catalog/catalog-search-params'
import type {CatalogSortMode} from '@/lib/catalog/marketing-catalog-items'
import type {MarketingCatalogCategoryNavOption} from '@/lib/catalog/marketing-catalog-items'
import {
  catalogBrandCategorySecondSegment,
  type CatalogPathResolved,
} from '@/lib/catalog/catalog-path-resolve'

const CATALOG_PATH = '/catalogue'

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
    return catalogBrowseWithSegments(
      {
        page: 1,
        sort: 'recent',
        colorSlugs: [],
        sizeSlugs: [],
        availabilitySlugs: [],
        segmentSlug: null,
        subSlug: null,
      },
      brandSlug,
      categorySlug,
    )
  }
  if (brandSlug) {
    return catalogBrowseWithSegments(
      {
        page: 1,
        sort: 'recent',
        colorSlugs: [],
        sizeSlugs: [],
        availabilitySlugs: [],
        segmentSlug: null,
        subSlug: null,
      },
      brandSlug,
      null,
    )
  }
  if (categorySlug) {
    return catalogBrowseWithSegments(
      {
        page: 1,
        sort: 'recent',
        colorSlugs: [],
        sizeSlugs: [],
        availabilitySlugs: [],
        segmentSlug: null,
        subSlug: null,
      },
      categorySlug,
      null,
    )
  }
  return CATALOG_PATH
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

export function categoriesAllHref(resolved: CatalogPathResolved, query: CatalogBrowseQuery): string {
  if (resolved.kind === 'intersection' || resolved.kind === 'brand') {
    return catalogBrowseWithSegments(query, resolved.brandSlug, null)
  }
  return mergePathAndQuery(CATALOG_PATH, {...query, page: 1, segmentSlug: null, subSlug: null})
}

export function categoryItemHref(
  resolved: CatalogPathResolved,
  cat: MarketingCatalogCategoryNavOption,
  categories: MarketingCatalogCategoryNavOption[],
  query: CatalogBrowseQuery,
): string {
  let segmentSlug: string | null = null
  let subSlug: string | null = null

  if (cat.parentId == null) {
    const brandSlug = resolved.kind === 'brand' || resolved.kind === 'intersection' ? resolved.brandSlug : null
    if (brandSlug) {
      segmentSlug = brandSlug
      subSlug = cat.slug
    } else {
      segmentSlug = cat.slug
    }
  } else {
    const parent = categories.find((c) => c.id === cat.parentId)
    if (resolved.kind === 'brand' || resolved.kind === 'intersection') {
      segmentSlug = resolved.brandSlug
      subSlug = cat.slug
    } else if (parent) {
      segmentSlug = parent.slug
      subSlug = cat.slug
    } else {
      segmentSlug = cat.slug
    }
  }

  return catalogBrowseWithSegments(query, segmentSlug, subSlug)
}

export function brandItemHref(resolved: CatalogPathResolved, brandSlug: string, query: CatalogBrowseQuery): string {
  const second = catalogBrandCategorySecondSegment(resolved)
  if (second) return catalogBrowseWithSegments(query, brandSlug, second)
  return catalogBrowseWithSegments(query, brandSlug, null)
}

export function marquesResetHref(resolved: CatalogPathResolved, query: CatalogBrowseQuery): string {
  if (resolved.kind === 'all') return mergePathAndQuery(CATALOG_PATH, {...query, page: 1, segmentSlug: null, subSlug: null})
  if (resolved.kind === 'brand') {
    return mergePathAndQuery(CATALOG_PATH, {...query, page: 1, segmentSlug: null, subSlug: null})
  }
  if (resolved.kind === 'category') {
    const seg =
      resolved.segments.shape === 'parent_child' ? resolved.segments.parentSlug : resolved.segments.slug
    const sub = resolved.segments.shape === 'parent_child' ? resolved.segments.childSlug : null
    return catalogBrowseWithSegments(query, seg, sub)
  }
  if (resolved.kind === 'intersection') {
    return catalogBrowseWithSegments(query, null, resolved.categorySlug)
  }
  return CATALOG_PATH
}

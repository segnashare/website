import {categoryBySlug, collectDescendantCategoryIds} from '@/lib/catalog/catalog-category-tree'
import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import type {
  MarketingCatalogCategoryNavOption,
  MarketingCatalogFacetsNav,
} from '@/lib/catalog/marketing-catalog-items'

function uniqueSorted(slugs: string[]): string[] {
  return [...new Set(slugs.filter((s) => s.trim()))].sort()
}

export function brandSlugFromQuery(
  query: CatalogBrowseQuery,
  facets: MarketingCatalogFacetsNav,
): string | null {
  const seg = query.segmentSlug?.trim()
  if (!seg) return null
  return facets.brands.some((b) => b.slug === seg) ? seg : null
}

/** Slugs catégorie effectivement sélectionnés (param `categories` ou URL legacy `segment`/`categorie`). */
export function effectiveCategorySlugs(
  query: CatalogBrowseQuery,
  facets: MarketingCatalogFacetsNav,
): string[] {
  if ((query.categorySlugs ?? []).length > 0) return uniqueSorted(query.categorySlugs)

  const sub = query.subSlug?.trim()
  if (sub && categoryBySlug(facets.categories, sub)) return [sub]

  const seg = query.segmentSlug?.trim()
  if (seg && !brandSlugFromQuery(query, facets) && categoryBySlug(facets.categories, seg)) {
    return [seg]
  }
  return []
}

export function queryWithCategorySlugs(
  query: CatalogBrowseQuery,
  facets: MarketingCatalogFacetsNav,
  nextSlugs: string[],
): CatalogBrowseQuery {
  const brands = effectiveBrandSlugs(query, facets)
  return {
    ...query,
    page: 1,
    categorySlugs: uniqueSorted(nextSlugs),
    brandSlugs: brands,
    segmentSlug: brands.length > 0 ? null : brandSlugFromQuery(query, facets),
    subSlug: null,
  }
}

export function effectiveBrandSlugs(
  query: CatalogBrowseQuery,
  facets: MarketingCatalogFacetsNav,
): string[] {
  if ((query.brandSlugs ?? []).length > 0) return uniqueSorted(query.brandSlugs)
  const fromSegment = brandSlugFromQuery(query, facets)
  return fromSegment ? [fromSegment] : []
}

export function queryWithBrandSlugs(
  query: CatalogBrowseQuery,
  facets: MarketingCatalogFacetsNav,
  nextSlugs: string[],
): CatalogBrowseQuery {
  const brands = uniqueSorted(nextSlugs)
  return {
    ...query,
    page: 1,
    brandSlugs: brands,
    categorySlugs: effectiveCategorySlugs(query, facets),
    segmentSlug: null,
    subSlug: null,
  }
}

export function toggleBrandSlug(stored: readonly string[], slug: string): string[] {
  const set = new Set(stored)
  if (set.has(slug)) set.delete(slug)
  else set.add(slug)
  return uniqueSorted([...set])
}

export function toggleCategoryQuery(
  query: CatalogBrowseQuery,
  cat: MarketingCatalogCategoryNavOption,
  facets: MarketingCatalogFacetsNav,
): CatalogBrowseQuery {
  const current = effectiveCategorySlugs(query, facets)
  return queryWithCategorySlugs(query, facets, toggleCategorySlugs(current, cat))
}

export function toggleBrandQuery(
  query: CatalogBrowseQuery,
  brandSlug: string,
  facets: MarketingCatalogFacetsNav,
): CatalogBrowseQuery {
  return queryWithBrandSlugs(query, facets, toggleBrandSlug(effectiveBrandSlugs(query, facets), brandSlug))
}

export function isCategorySlugSelected(slug: string, stored: readonly string[]): boolean {
  return stored.includes(slug)
}

export function isCategoryChecked(
  cat: MarketingCatalogCategoryNavOption,
  query: CatalogBrowseQuery,
  facets: MarketingCatalogFacetsNav,
): boolean {
  return isCategorySlugSelected(cat.slug, effectiveCategorySlugs(query, facets))
}

export function toggleCategorySlugs(
  stored: readonly string[],
  cat: MarketingCatalogCategoryNavOption,
): string[] {
  const set = new Set(stored)
  if (set.has(cat.slug)) set.delete(cat.slug)
  else set.add(cat.slug)
  return uniqueSorted([...set])
}

/** IDs envoyés au RPC : correspondance exacte (catégories plates). */
export function categoryFilterIdsFromSlugs(
  slugs: readonly string[],
  categories: MarketingCatalogCategoryNavOption[],
): string[] {
  const ids = new Set<string>()
  for (const slug of slugs) {
    const cat = categoryBySlug(categories, slug)
    if (!cat) continue
    for (const id of collectDescendantCategoryIds(cat.id, categories)) ids.add(id)
  }
  return [...ids]
}

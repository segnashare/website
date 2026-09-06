import {categoryBySlug, childrenOf, collectDescendantCategoryIds} from '@/lib/catalog/catalog-category-tree'
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
    categorySlugs: canonicalizeCategorySlugs(nextSlugs, facets.categories),
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
  return queryWithCategorySlugs(query, facets, toggleCategorySlugs(current, cat, facets.categories))
}

export function toggleBrandQuery(
  query: CatalogBrowseQuery,
  brandSlug: string,
  facets: MarketingCatalogFacetsNav,
): CatalogBrowseQuery {
  return queryWithBrandSlugs(query, facets, toggleBrandSlug(effectiveBrandSlugs(query, facets), brandSlug))
}

/** Si tous les enfants d’un parent sont cochés, on ne stocke que le parent. */
export function canonicalizeCategorySlugs(
  slugs: string[],
  categories: MarketingCatalogCategoryNavOption[],
): string[] {
  const set = new Set(uniqueSorted(slugs))
  const parents = categories.filter((c) => c.parentId == null)
  for (const root of parents) {
    const kids = childrenOf(root.id, categories)
    if (kids.length === 0) continue
    if (set.has(root.slug) || kids.every((k) => set.has(k.slug))) {
      set.add(root.slug)
      for (const k of kids) set.delete(k.slug)
    }
  }
  return uniqueSorted([...set])
}

function slugImpliedByParent(
  slug: string,
  stored: ReadonlySet<string>,
  categories: MarketingCatalogCategoryNavOption[],
): boolean {
  const node = categoryBySlug(categories, slug)
  if (!node?.parentId) return false
  const parent = categories.find((c) => c.id === node.parentId)
  return Boolean(parent && stored.has(parent.slug))
}

export function isCategorySlugSelected(
  slug: string,
  stored: readonly string[],
  categories: MarketingCatalogCategoryNavOption[],
): boolean {
  const set = new Set(stored)
  return set.has(slug) || slugImpliedByParent(slug, set, categories)
}

export function isCategoryRootSelected(
  root: MarketingCatalogCategoryNavOption,
  stored: readonly string[],
  categories: MarketingCatalogCategoryNavOption[],
): boolean {
  if (isCategorySlugSelected(root.slug, stored, categories)) return true
  const kids = childrenOf(root.id, categories)
  if (kids.length === 0) return false
  return kids.every((k) => isCategorySlugSelected(k.slug, stored, categories))
}

export function isCategoryRootChecked(
  root: MarketingCatalogCategoryNavOption,
  query: CatalogBrowseQuery,
  facets: MarketingCatalogFacetsNav,
): boolean {
  return isCategoryRootSelected(root, effectiveCategorySlugs(query, facets), facets.categories)
}

export function isCategoryChildChecked(
  cat: MarketingCatalogCategoryNavOption,
  query: CatalogBrowseQuery,
  facets: MarketingCatalogFacetsNav,
): boolean {
  return isCategorySlugSelected(cat.slug, effectiveCategorySlugs(query, facets), facets.categories)
}

export function toggleCategorySlugs(
  stored: readonly string[],
  cat: MarketingCatalogCategoryNavOption,
  categories: MarketingCatalogCategoryNavOption[],
): string[] {
  const set = new Set(stored)
  const selected = (slug: string) => isCategorySlugSelected(slug, [...set], categories)

  if (cat.parentId == null) {
    const kids = childrenOf(cat.id, categories)
    const allOn = selected(cat.slug) || (kids.length > 0 && kids.every((k) => selected(k.slug)))
    if (allOn) {
      set.delete(cat.slug)
      for (const k of kids) set.delete(k.slug)
    } else {
      set.add(cat.slug)
      for (const k of kids) set.delete(k.slug)
    }
    return canonicalizeCategorySlugs([...set], categories)
  }

  const parent = categories.find((c) => c.id === cat.parentId)
  if (selected(cat.slug)) {
    set.delete(cat.slug)
    if (parent && set.has(parent.slug)) {
      set.delete(parent.slug)
      for (const k of childrenOf(parent.id, categories)) {
        if (k.id !== cat.id) set.add(k.slug)
      }
    }
  } else {
    set.add(cat.slug)
    if (parent) {
      const kids = childrenOf(parent.id, categories)
      if (kids.every((k) => k.id === cat.id || selected(k.slug))) {
        set.add(parent.slug)
        for (const k of kids) set.delete(k.slug)
      }
    }
  }
  return canonicalizeCategorySlugs([...set], categories)
}

/** IDs envoyés au RPC : chaque nœud sélectionné inclut toute sa descendance. */
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

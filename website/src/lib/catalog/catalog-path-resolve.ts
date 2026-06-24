import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import {
  categoryBySlug,
  categorySubtreeContainsResolvedSlug,
  collectDescendantCategoryIds,
  rootCategoryForSlug,
} from '@/lib/catalog/catalog-category-tree'
import type {MarketingCatalogFacetsNav} from '@/lib/catalog/marketing-catalog-items'
import type {CatalogPathResolved, CategoryPathSegments} from '@/lib/catalog/catalog-path-types'

export {idsForCatalogRpc} from '@/lib/catalog/catalog-facet-scope-ids'
export type {CatalogPathResolved, CategoryPathSegments} from '@/lib/catalog/catalog-path-types'

const CATALOG_PATHNAME = '/catalogue'
const RESERVED_SEGMENTS = new Set(['piece', 'api'])

function categoryFilterIdsForNode(
  cat: {id: string; parentId: string | null},
  categories: MarketingCatalogFacetsNav['categories'],
): string[] {
  if (cat.parentId == null) {
    return collectDescendantCategoryIds(cat.id, categories)
  }
  return [cat.id]
}

/** Second segment pour `catalogBrowsePath(marque, ?)` (feuille ou catégorie seule). */
export function catalogBrandCategorySecondSegment(resolved: CatalogPathResolved): string | null {
  if (resolved.kind === 'intersection') return resolved.categorySlug
  if (resolved.kind === 'category') {
    if (resolved.segments.shape === 'parent_child') return resolved.segments.childSlug
    return resolved.segments.slug
  }
  return null
}

export function resolveCatalogOneSegment(
  facets: MarketingCatalogFacetsNav,
  segment: string,
): CatalogPathResolved | null {
  const s = segment.trim().toLowerCase()
  if (!s || RESERVED_SEGMENTS.has(s)) return null

  const brand = facets.brands.find((b) => b.slug === s)
  if (brand) return {kind: 'brand', brandSlug: brand.slug, brandId: brand.id}

  const cat = categoryBySlug(facets.categories, segment)
  if (!cat) return null

  const categoryFilterIds = categoryFilterIdsForNode(cat, facets.categories)
  return {
    kind: 'category',
    segments: {shape: 'single', slug: cat.slug},
    categoryFilterIds,
  }
}

function resolveCategoryParentChild(
  facets: MarketingCatalogFacetsNav,
  parentSlug: string,
  childSlug: string,
): CatalogPathResolved | null {
  const parent = categoryBySlug(facets.categories, parentSlug)
  if (!parent || parent.parentId != null) return null
  const child = categoryBySlug(facets.categories, childSlug)
  if (!child || child.parentId !== parent.id) return null
  return {
    kind: 'category',
    segments: {shape: 'parent_child', parentSlug: parent.slug, childSlug: child.slug},
    categoryFilterIds: [child.id],
  }
}

export function resolveCatalogIntersection(
  facets: MarketingCatalogFacetsNav,
  firstSlug: string,
  secondSlug: string,
): CatalogPathResolved | null {
  const f1 = firstSlug.trim().toLowerCase()
  const b = facets.brands.find((x) => x.slug === f1)
  const c = categoryBySlug(facets.categories, secondSlug)
  if (b && c) {
    return {
      kind: 'intersection',
      brandSlug: b.slug,
      brandId: b.id,
      categorySlug: c.slug,
      categoryFilterIds: categoryFilterIdsForNode(c, facets.categories),
    }
  }
  return resolveCategoryParentChild(facets, firstSlug, secondSlug)
}

/** Résout marque / catégorie depuis les query params (`segment`, `categorie`). */
export function resolveCatalogFromQuery(
  facets: MarketingCatalogFacetsNav,
  query: CatalogBrowseQuery,
): CatalogPathResolved | null {
  const seg = query.segmentSlug?.trim()
  const sub = query.subSlug?.trim()
  if (!seg) return {kind: 'all'}
  if (sub) return resolveCatalogIntersection(facets, seg, sub)
  return resolveCatalogOneSegment(facets, seg)
}

export function catalogListingPath(_resolved: CatalogPathResolved): string {
  return CATALOG_PATHNAME
}

/** Parent dont la colonne doit lister les sous-catégories (URL feuille courte incluse). */
export function catalogCategoryRootNavOpen(
  resolved: CatalogPathResolved,
  rootSlug: string,
  categories: MarketingCatalogFacetsNav['categories'],
): boolean {
  if (resolved.kind === 'category') {
    if (resolved.segments.shape === 'parent_child') {
      return resolved.segments.parentSlug === rootSlug
    }
    const r = rootCategoryForSlug(categories, resolved.segments.slug)
    return r?.slug === rootSlug
  }
  if (resolved.kind === 'intersection') {
    return categorySubtreeContainsResolvedSlug(categories, rootSlug, resolved.categorySlug)
  }
  return false
}

export function catalogCategoryRootLinkActive(
  resolved: CatalogPathResolved,
  root: MarketingCatalogFacetsNav['categories'][number],
  categories: MarketingCatalogFacetsNav['categories'],
): boolean {
  if (root.parentId != null) return false
  return catalogCategoryRootNavOpen(resolved, root.slug, categories)
}

export function catalogCategoryChildLinkActive(
  resolved: CatalogPathResolved,
  cat: MarketingCatalogFacetsNav['categories'][number],
): boolean {
  if (cat.parentId == null) return false
  if (resolved.kind === 'category' && resolved.segments.shape === 'parent_child') {
    return resolved.segments.childSlug === cat.slug
  }
  if (resolved.kind === 'category' && resolved.segments.shape === 'single') {
    return resolved.segments.slug === cat.slug
  }
  if (resolved.kind === 'intersection') {
    return resolved.categorySlug === cat.slug
  }
  return false
}

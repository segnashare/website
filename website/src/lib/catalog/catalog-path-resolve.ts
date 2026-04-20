import {catalogBrowsePath} from '@/lib/catalog/catalog-browse-href'
import {
  categoryBySlug,
  categorySubtreeContainsResolvedSlug,
  collectDescendantCategoryIds,
  rootCategoryForSlug,
} from '@/lib/catalog/catalog-category-tree'
import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import type {MarketingCatalogFacetsNav} from '@/lib/catalog/marketing-catalog-items'

export type CategoryPathSegments =
  | {shape: 'single'; slug: string}
  | {shape: 'parent_child'; parentSlug: string; childSlug: string}

export type CatalogPathResolved =
  | {kind: 'all'}
  | {kind: 'brand'; brandSlug: string; brandId: string}
  | {
      kind: 'category'
      segments: CategoryPathSegments
      categoryFilterIds: string[]
    }
  | {
      kind: 'intersection'
      brandSlug: string
      brandId: string
      categorySlug: string
      categoryFilterIds: string[]
    }

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

export function catalogListingPath(resolved: CatalogPathResolved): string {
  if (resolved.kind === 'all') return '/catalogue'
  if (resolved.kind === 'brand') return catalogBrowsePath(resolved.brandSlug, null)
  if (resolved.kind === 'category') {
    if (resolved.segments.shape === 'single') {
      return catalogBrowsePath(null, resolved.segments.slug)
    }
    return catalogBrowsePath(resolved.segments.parentSlug, resolved.segments.childSlug)
  }
  return catalogBrowsePath(resolved.brandSlug, resolved.categorySlug)
}

export function idsForCatalogRpc(
  resolved: CatalogPathResolved,
  query: CatalogBrowseQuery,
  facets: MarketingCatalogFacetsNav,
): {
  categoryIds: string[]
  brandIds: string[]
  colorIds: string[]
  sizeIds: string[]
} {
  let categoryIds: string[] = []
  let brandIds: string[] = []

  if (resolved.kind === 'brand') {
    brandIds = [resolved.brandId]
  } else if (resolved.kind === 'category') {
    categoryIds = resolved.categoryFilterIds
  } else if (resolved.kind === 'intersection') {
    brandIds = [resolved.brandId]
    categoryIds = resolved.categoryFilterIds
  }

  const colorIds = query.colorSlugs
    .map((slug) => facets.colors.find((c) => c.slug === slug)?.id)
    .filter((x): x is string => Boolean(x))

  const sizeIds = query.sizeSlugs
    .map((slug) => facets.sizes.find((s) => s.slug === slug)?.id)
    .filter((x): x is string => Boolean(x))

  return {categoryIds, brandIds, colorIds, sizeIds}
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

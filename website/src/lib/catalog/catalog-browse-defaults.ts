import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'

/** Query catalogue sans filtres — rendu SSR unique par chemin (cache CDN / ISR). */
export const DEFAULT_CATALOG_BROWSE_QUERY: CatalogBrowseQuery = {
  page: 1,
  sort: 'recent',
  colorSlugs: [],
  sizeSlugs: [],
  availabilitySlugs: [],
  categorySlugs: [],
  brandSlugs: [],
  segmentSlug: null,
  subSlug: null,
  newOnly: false,
  tagSlug: null,
}

export function catalogBrowseQueriesEqual(a: CatalogBrowseQuery, b: CatalogBrowseQuery): boolean {
  const aa = {
    colorSlugs: a.colorSlugs ?? [],
    sizeSlugs: a.sizeSlugs ?? [],
    availabilitySlugs: a.availabilitySlugs ?? [],
    categorySlugs: a.categorySlugs ?? [],
    brandSlugs: a.brandSlugs ?? [],
  }
  const bb = {
    colorSlugs: b.colorSlugs ?? [],
    sizeSlugs: b.sizeSlugs ?? [],
    availabilitySlugs: b.availabilitySlugs ?? [],
    categorySlugs: b.categorySlugs ?? [],
    brandSlugs: b.brandSlugs ?? [],
  }
  return (
    a.page === b.page &&
    a.sort === b.sort &&
    aa.colorSlugs.join(',') === bb.colorSlugs.join(',') &&
    aa.sizeSlugs.join(',') === bb.sizeSlugs.join(',') &&
    aa.availabilitySlugs.join(',') === bb.availabilitySlugs.join(',') &&
    [...aa.categorySlugs].sort().join(',') === [...bb.categorySlugs].sort().join(',') &&
    [...aa.brandSlugs].sort().join(',') === [...bb.brandSlugs].sort().join(',') &&
    a.segmentSlug === b.segmentSlug &&
    a.subSlug === b.subSlug &&
    Boolean(a.newOnly) === Boolean(b.newOnly) &&
    (a.tagSlug ?? null) === (b.tagSlug ?? null)
  )
}

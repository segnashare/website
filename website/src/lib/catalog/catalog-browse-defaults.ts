import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'

/** Query catalogue sans filtres — rendu SSR unique par chemin (cache CDN / ISR). */
export const DEFAULT_CATALOG_BROWSE_QUERY: CatalogBrowseQuery = {
  page: 1,
  sort: 'recent',
  colorSlugs: [],
  sizeSlugs: [],
  availabilitySlugs: [],
  segmentSlug: null,
  subSlug: null,
}

export function catalogBrowseQueriesEqual(a: CatalogBrowseQuery, b: CatalogBrowseQuery): boolean {
  const aa = {
    colorSlugs: a.colorSlugs ?? [],
    sizeSlugs: a.sizeSlugs ?? [],
    availabilitySlugs: a.availabilitySlugs ?? [],
  }
  const bb = {
    colorSlugs: b.colorSlugs ?? [],
    sizeSlugs: b.sizeSlugs ?? [],
    availabilitySlugs: b.availabilitySlugs ?? [],
  }
  return (
    a.page === b.page &&
    a.sort === b.sort &&
    aa.colorSlugs.join(',') === bb.colorSlugs.join(',') &&
    aa.sizeSlugs.join(',') === bb.sizeSlugs.join(',') &&
    aa.availabilitySlugs.join(',') === bb.availabilitySlugs.join(',') &&
    a.segmentSlug === b.segmentSlug &&
    a.subSlug === b.subSlug
  )
}

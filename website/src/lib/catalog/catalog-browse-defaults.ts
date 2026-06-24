import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'

/** Query catalogue sans filtres — rendu SSR unique par chemin (cache CDN / ISR). */
export const DEFAULT_CATALOG_BROWSE_QUERY: CatalogBrowseQuery = {
  page: 1,
  sort: 'recent',
  colorSlugs: [],
  sizeSlugs: [],
}

export function catalogBrowseQueriesEqual(a: CatalogBrowseQuery, b: CatalogBrowseQuery): boolean {
  return (
    a.page === b.page &&
    a.sort === b.sort &&
    a.colorSlugs.join(',') === b.colorSlugs.join(',') &&
    a.sizeSlugs.join(',') === b.sizeSlugs.join(',')
  )
}

import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import {mergePathAndQuery, serializeCatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import type {MarketingCatalogFacetsNav, MarketingCatalogGridItem} from '@/lib/catalog/marketing-catalog-items'

export type CatalogBrowseFetchResult = {
  items: MarketingCatalogGridItem[]
  total: number
  query: CatalogBrowseQuery
  facets: MarketingCatalogFacetsNav
}

export async function fetchCatalogBrowseClient(
  pathname: string,
  query: CatalogBrowseQuery,
): Promise<CatalogBrowseFetchResult> {
  const sp = serializeCatalogBrowseQuery(query)
  sp.set('pathname', pathname)
  const res = await fetch(`/api/marketing/catalog/browse?${sp.toString()}`, {cache: 'force-cache'})
  if (!res.ok) throw new Error(String(res.status))
  const data = (await res.json()) as Partial<CatalogBrowseFetchResult>
  return {
    items: Array.isArray(data.items) ? data.items : [],
    total: typeof data.total === 'number' ? data.total : 0,
    query: data.query ?? query,
    facets: data.facets as MarketingCatalogFacetsNav,
  }
}

export function syncCatalogBrowseUrl(pathname: string, query: CatalogBrowseQuery): void {
  const href = mergePathAndQuery(pathname, query)
  window.history.replaceState(window.history.state, '', href)
}

import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import {mergePathAndQuery, serializeCatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import type {CatalogPathResolved} from '@/lib/catalog/catalog-path-types'
import type {MarketingCatalogFacetsNav, MarketingCatalogGridItem} from '@/lib/catalog/marketing-catalog-items'

export type CatalogBrowseFetchResult = {
  items: MarketingCatalogGridItem[]
  total: number
  query: CatalogBrowseQuery
  facets: MarketingCatalogFacetsNav
  resolved: CatalogPathResolved
}

export async function fetchCatalogBrowseClient(query: CatalogBrowseQuery): Promise<CatalogBrowseFetchResult> {
  const sp = serializeCatalogBrowseQuery(query)
  const res = await fetch(`/api/marketing/catalog/browse?${sp.toString()}`, {cache: 'no-store'})
  if (!res.ok) throw new Error(String(res.status))
  const data = (await res.json()) as Partial<CatalogBrowseFetchResult>
  return {
    items: Array.isArray(data.items) ? data.items : [],
    total: typeof data.total === 'number' ? data.total : 0,
    query: data.query ?? query,
    facets: data.facets as MarketingCatalogFacetsNav,
    resolved: data.resolved ?? {kind: 'all'},
  }
}

export function syncCatalogBrowseUrl(query: CatalogBrowseQuery): void {
  if (typeof window === 'undefined') return
  // Ne pas écraser une navigation vers la page détail pièce.
  if (window.location.pathname.startsWith('/catalogue/piece/')) return
  const href = mergePathAndQuery('/catalogue', query)
  window.history.replaceState(window.history.state, '', href)
}

import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import type {CatalogPathResolved} from '@/lib/catalog/catalog-path-resolve'
import {catalogListingPath, resolveCatalogFromQuery} from '@/lib/catalog/catalog-path-resolve'
import {idsForCatalogRpc} from '@/lib/catalog/catalog-facet-scope-ids'
import {catalogPerfEnabled, catalogPerfLog, catalogPerfNow} from '@/lib/catalog/catalog-perf'
import {
  fetchMarketingCatalogBrowseFacetsNav,
  fetchMarketingCatalogItemsPage,
  fetchMarketingCatalogPathResolveNav,
  gridItemsFromRows,
  type MarketingCatalogFacetsNav,
  type MarketingCatalogGridItem,
} from '@/lib/catalog/marketing-catalog-items'
import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'

export type CatalogBrowsePayload = {
  facets: MarketingCatalogFacetsNav
  items: MarketingCatalogGridItem[]
  total: number
  pathname: string
  resolved: CatalogPathResolved
  query: CatalogBrowseQuery
}

/** Charge le catalogue depuis `/catalogue` + query (`segment`, `categorie`, filtres). */
export async function loadCatalogBrowse(query: CatalogBrowseQuery): Promise<CatalogBrowsePayload | null> {
  const t0 = catalogPerfNow()
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return null

  const pathNav = await fetchMarketingCatalogPathResolveNav()
  if (!pathNav) return null

  const resolved = resolveCatalogFromQuery(pathNav, query)
  if (!resolved) return null

  const facets = await fetchMarketingCatalogBrowseFacetsNav(pathNav, resolved, query)
  const tFacets1 = catalogPerfNow()
  const {categoryIds, brandIds, colorIds, sizeIds} = idsForCatalogRpc(resolved, query, facets, {
    slugFacetSource: pathNav,
  })
  const pageSize = 30
  const offset = (query.page - 1) * pageSize

  const tItems0 = catalogPerfNow()
  const {items: rows, total} = await fetchMarketingCatalogItemsPage({
    limit: pageSize,
    offset,
    sort: query.sort,
    categoryIds,
    brandIds,
    colorIds,
    sizeIds,
  })
  const tAfterRows = catalogPerfNow()

  const items = await gridItemsFromRows(supabase, rows)
  const tEnd = catalogPerfNow()

  if (catalogPerfEnabled()) {
    catalogPerfLog('loadCatalogBrowse', {
      totalMs: Math.round(tEnd - t0),
      facetsMs: Math.round(tFacets1 - t0),
      itemsRpcMs: Math.round(tAfterRows - tItems0),
      gridCoversMs: Math.round(tEnd - tAfterRows),
      rowCount: rows.length,
    })
  }

  return {
    facets,
    items,
    total,
    pathname: catalogListingPath(resolved),
    resolved,
    query,
  }
}

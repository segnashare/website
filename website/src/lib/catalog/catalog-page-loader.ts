import {itemMatchesAvailabilityFilter} from '@/lib/catalog/catalog-availability'
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
  type MarketingCatalogItemRow,
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

async function fetchAllMarketingCatalogItemsForScope(params: {
  sort: CatalogBrowseQuery['sort']
  categoryIds: string[]
  brandIds: string[]
  colorIds: string[]
  sizeIds: string[]
}): Promise<MarketingCatalogItemRow[]> {
  const pageSize = 100
  const all: MarketingCatalogItemRow[] = []
  let offset = 0
  let total = Infinity

  while (offset < total && all.length < 500) {
    const batch = await fetchMarketingCatalogItemsPage({
      limit: pageSize,
      offset,
      sort: params.sort,
      categoryIds: params.categoryIds,
      brandIds: params.brandIds,
      colorIds: params.colorIds,
      sizeIds: params.sizeIds,
    })
    total = batch.total
    all.push(...batch.items)
    if (batch.items.length === 0) break
    offset += pageSize
  }

  return all
}

/** Charge le catalogue depuis `/catalogue` + query (`segment`, `categorie`, filtres). */
export async function loadCatalogBrowse(query: CatalogBrowseQuery): Promise<CatalogBrowsePayload | null> {
  const t0 = catalogPerfNow()
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return null

  const pathNav = await fetchMarketingCatalogPathResolveNav()
  if (!pathNav) return null

  // Segment inconnu → catalogue complet plutôt qu’une 503 (casse les filtres client).
  const resolved = resolveCatalogFromQuery(pathNav, query) ?? {kind: 'all' as const}

  const facets = await fetchMarketingCatalogBrowseFacetsNav(pathNav, resolved, query)
  const tFacets1 = catalogPerfNow()
  const {categoryIds, brandIds, colorIds, sizeIds} = idsForCatalogRpc(resolved, query, facets, {
    slugFacetSource: pathNav,
  })
  const pageSize = 30
  const offset = (query.page - 1) * pageSize
  const hasAvailabilityFilter = query.availabilitySlugs.length > 0

  const tItems0 = catalogPerfNow()
  let rows: MarketingCatalogItemRow[]
  let total: number

  if (hasAvailabilityFilter) {
    const allRows = await fetchAllMarketingCatalogItemsForScope({
      sort: query.sort,
      categoryIds,
      brandIds,
      colorIds,
      sizeIds,
    })
    const filtered = allRows.filter((r) => itemMatchesAvailabilityFilter(r, query.availabilitySlugs))
    total = filtered.length
    rows = filtered.slice(offset, offset + pageSize)
  } else {
    const page = await fetchMarketingCatalogItemsPage({
      limit: pageSize,
      offset,
      sort: query.sort,
      categoryIds,
      brandIds,
      colorIds,
      sizeIds,
    })
    rows = page.items
    total = page.total
  }
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
      availabilityFilter: hasAvailabilityFilter,
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

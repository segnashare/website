import {
  itemMatchesAvailabilityFilter,
  itemStatusesForAvailability,
} from '@/lib/catalog/catalog-availability'
import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import type {CatalogPathResolved} from '@/lib/catalog/catalog-path-resolve'
import {catalogListingPath, resolveCatalogFromQuery} from '@/lib/catalog/catalog-path-resolve'
import {idsForCatalogRpc} from '@/lib/catalog/catalog-facet-scope-ids'
import {catalogPerfEnabled, catalogPerfLog, catalogPerfNow} from '@/lib/catalog/catalog-perf'
import {
  fetchMarketingCatalogBrowseFacetsNav,
  fetchMarketingCatalogItemsByIds,
  fetchMarketingCatalogItemsPage,
  fetchMarketingCatalogPathResolveNav,
  gridItemsFromRows,
  type MarketingCatalogFacetsNav,
  type MarketingCatalogGridItem,
  type MarketingCatalogItemRow,
} from '@/lib/catalog/marketing-catalog-items'
import {sortMarketingCatalogSoldLast} from '@/lib/catalog/catalog-sold-sort'
import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'
import type {SupabaseClient} from '@supabase/supabase-js'

export type CatalogBrowsePayload = {
  facets: MarketingCatalogFacetsNav
  items: MarketingCatalogGridItem[]
  total: number
  pathname: string
  resolved: CatalogPathResolved
  query: CatalogBrowseQuery
}

type ScopeIds = {
  categoryIds: string[]
  brandIds: string[]
  colorIds: string[]
  sizeIds: string[]
}

/**
 * Page filtrée par disponibilité via `items.status` (1 requête count + 1 page d’ids),
 * puis hydratation marketing — évite de parcourir tout le catalogue.
 */
async function fetchMarketingCatalogPageByAvailability(
  supabase: SupabaseClient,
  params: {
    sort: CatalogBrowseQuery['sort']
    limit: number
    offset: number
    availabilitySlugs: string[]
  } & ScopeIds,
): Promise<{items: MarketingCatalogItemRow[]; total: number}> {
  const statuses = itemStatusesForAvailability(params.availabilitySlugs)
  if (statuses.length === 0) {
    return fetchMarketingCatalogItemsPage({
      limit: params.limit,
      offset: params.offset,
      sort: params.sort,
      categoryIds: params.categoryIds,
      brandIds: params.brandIds,
      colorIds: params.colorIds,
      sizeIds: params.sizeIds,
    })
  }

  const {data: corpUsers} = await supabase.from('users').select('id').eq('status', 'corporate_inventory')
  const corpIds = (corpUsers ?? []).map((u) => u.id).filter((id): id is string => typeof id === 'string')

  let countQuery = supabase
    .from('items')
    .select('id', {count: 'exact', head: true})
    .is('deleted_at', null)
    .in('status', statuses)

  let listQuery = supabase.from('items').select('id').is('deleted_at', null).in('status', statuses)

  if (corpIds.length > 0) {
    const corpFilter = `(${corpIds.join(',')})`
    countQuery = countQuery.not('owner_user_id', 'in', corpFilter)
    listQuery = listQuery.not('owner_user_id', 'in', corpFilter)
  }
  if (params.categoryIds.length === 1) {
    countQuery = countQuery.eq('item_category_id', params.categoryIds[0]!)
    listQuery = listQuery.eq('item_category_id', params.categoryIds[0]!)
  } else if (params.categoryIds.length > 1) {
    countQuery = countQuery.in('item_category_id', params.categoryIds)
    listQuery = listQuery.in('item_category_id', params.categoryIds)
  }
  if (params.brandIds.length > 0) {
    countQuery = countQuery.in('item_brand_id', params.brandIds)
    listQuery = listQuery.in('item_brand_id', params.brandIds)
  }
  if (params.colorIds.length > 0) {
    countQuery = countQuery.in('item_couleur_id', params.colorIds)
    listQuery = listQuery.in('item_couleur_id', params.colorIds)
  }
  if (params.sizeIds.length > 0) {
    countQuery = countQuery.in('item_size_id', params.sizeIds)
    listQuery = listQuery.in('item_size_id', params.sizeIds)
  }

  if (params.sort === 'price_asc') {
    listQuery = listQuery.order('price_points', {ascending: true, nullsFirst: false})
  } else if (params.sort === 'price_desc') {
    listQuery = listQuery.order('price_points', {ascending: false, nullsFirst: false})
  } else {
    listQuery = listQuery.order('created_at', {ascending: false})
  }

  const [{count, error: countErr}, {data: idRows, error: listErr}] = await Promise.all([
    countQuery,
    listQuery.range(params.offset, params.offset + params.limit - 1),
  ])

  if (countErr || listErr) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[marketing-catalog] availability page', countErr?.message ?? listErr?.message)
    }
    // Fallback : scan limité (évite panne totale).
    const page = await fetchMarketingCatalogItemsPage({
      limit: Math.min(100, params.limit * 3),
      offset: 0,
      sort: params.sort,
      categoryIds: params.categoryIds,
      brandIds: params.brandIds,
      colorIds: params.colorIds,
      sizeIds: params.sizeIds,
    })
    const filtered = page.items.filter((r) =>
      itemMatchesAvailabilityFilter(r, params.availabilitySlugs),
    )
    return {
      items: filtered.slice(params.offset, params.offset + params.limit),
      total: filtered.length,
    }
  }

  const total = typeof count === 'number' ? count : 0
  const ids = (idRows ?? []).map((r) => r.id).filter((id): id is string => typeof id === 'string')
  if (ids.length === 0) return {items: [], total}

  const byIdRows = await fetchMarketingCatalogItemsByIds(ids)
  const byId = new Map(byIdRows.map((r) => [r.id, r]))
  const items = ids.map((id) => byId.get(id)).filter((r): r is MarketingCatalogItemRow => Boolean(r))
  // Sold en dernier même si PostgREST ne peut pas exprimer le CASE du RPC.
  return {items: sortMarketingCatalogSoldLast(items), total}
}

/** Charge le catalogue depuis `/catalogue` + query (`segment`, `categorie`, filtres). */
export async function loadCatalogBrowse(query: CatalogBrowseQuery): Promise<CatalogBrowsePayload | null> {
  const t0 = catalogPerfNow()
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return null

  const pathNav = await fetchMarketingCatalogPathResolveNav()
  if (!pathNav) return null

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
    const page = await fetchMarketingCatalogPageByAvailability(supabase, {
      sort: query.sort,
      limit: pageSize,
      offset,
      availabilitySlugs: query.availabilitySlugs,
      categoryIds,
      brandIds,
      colorIds,
      sizeIds,
    })
    rows = page.items
    total = page.total
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

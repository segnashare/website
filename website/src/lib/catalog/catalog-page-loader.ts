import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import type {CatalogPathResolved} from '@/lib/catalog/catalog-path-resolve'
import {
  catalogListingPath,
  idsForCatalogRpc,
  resolveCatalogIntersection,
  resolveCatalogOneSegment,
} from '@/lib/catalog/catalog-path-resolve'
import {
  fetchMarketingCatalogFacetsNav,
  fetchMarketingCatalogItemsPage,
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

function pathnameForResolved(resolved: CatalogPathResolved): string {
  return catalogListingPath(resolved)
}

export async function loadCatalogBrowsePayload(
  resolved: CatalogPathResolved,
  query: CatalogBrowseQuery,
): Promise<CatalogBrowsePayload | null> {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return null

  const facets = await fetchMarketingCatalogFacetsNav()
  if (!facets) return null

  const {categoryIds, brandIds, colorIds, sizeIds} = idsForCatalogRpc(resolved, query, facets)
  const pageSize = 50
  const offset = (query.page - 1) * pageSize

  const {items: rows, total} = await fetchMarketingCatalogItemsPage({
    limit: pageSize,
    offset,
    sort: query.sort,
    categoryIds,
    brandIds,
    colorIds,
    sizeIds,
  })

  const items = await gridItemsFromRows(supabase, rows)

  return {
    facets,
    items,
    total,
    pathname: pathnameForResolved(resolved),
    resolved,
    query,
  }
}

export type CatalogPathInput =
  | {kind: 'all'}
  | {kind: 'one'; segment: string}
  | {kind: 'pair'; brandSlug: string; categorySlug: string}

/** Une seule lecture des facettes puis résolution du chemin + chargement des pièces. */
export async function loadCatalogBrowseFromPath(
  path: CatalogPathInput,
  query: CatalogBrowseQuery,
): Promise<CatalogBrowsePayload | null> {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return null

  const facets = await fetchMarketingCatalogFacetsNav()
  if (!facets) return null

  let resolved: CatalogPathResolved | null = null
  if (path.kind === 'all') {
    resolved = {kind: 'all'}
  } else if (path.kind === 'one') {
    resolved = resolveCatalogOneSegment(facets, path.segment)
  } else {
    resolved = resolveCatalogIntersection(facets, path.brandSlug, path.categorySlug)
  }

  if (!resolved) return null

  const {categoryIds, brandIds, colorIds, sizeIds} = idsForCatalogRpc(resolved, query, facets)
  const pageSize = 50
  const offset = (query.page - 1) * pageSize

  const {items: rows, total} = await fetchMarketingCatalogItemsPage({
    limit: pageSize,
    offset,
    sort: query.sort,
    categoryIds,
    brandIds,
    colorIds,
    sizeIds,
  })

  const items = await gridItemsFromRows(supabase, rows)

  return {
    facets,
    items,
    total,
    pathname: pathnameForResolved(resolved),
    resolved,
    query,
  }
}

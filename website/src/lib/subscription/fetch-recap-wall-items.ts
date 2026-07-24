import {
  fetchMarketingCatalogItemsPage,
  gridItemsFromRows,
} from '@/lib/catalog/marketing-catalog-items'
import type {RecapWallItem} from '@/lib/subscription/recap-wall-types'
import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'

export type {RecapWallItem}

/** 45 pièces marketing les plus chères (couverture signée), pour le mur défilant récap. */
export async function fetchRecapWallItems(limit = 45): Promise<RecapWallItem[]> {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return []

  const {items: rows} = await fetchMarketingCatalogItemsPage({
    limit: Math.min(60, Math.max(1, limit)),
    offset: 0,
    sort: 'price_desc',
    brandIds: [],
    colorIds: [],
    sizeIds: [],
  })

  const grid = await gridItemsFromRows(supabase, rows)
  return grid
    .filter((item): item is typeof item & {coverUrl: string} => Boolean(item.coverUrl))
    .map((item) => ({
      id: item.id,
      title: item.title,
      coverUrl: item.coverUrl,
    }))
}

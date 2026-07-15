import {
  fetchMarketingCatalogItemsPage,
  gridItemsFromRows,
  type MarketingCatalogGridItem,
} from '@/lib/catalog/marketing-catalog-items'
import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'

const RECOMMENDED_LIMIT = 8

/** Pièces proches : même catégorie + même taille, hors pièce courante. */
export async function loadCatalogItemRecommended(params: {
  excludeItemId: string
  categoryId: string | null
  sizeId: string | null
}): Promise<MarketingCatalogGridItem[]> {
  const categoryId = params.categoryId?.trim() || null
  const sizeId = params.sizeId?.trim() || null
  if (!categoryId && !sizeId) return []

  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return []

  const page = await fetchMarketingCatalogItemsPage({
    limit: RECOMMENDED_LIMIT + 4,
    offset: 0,
    sort: 'recent',
    categoryIds: categoryId ? [categoryId] : [],
    brandIds: [],
    colorIds: [],
    sizeIds: sizeId ? [sizeId] : [],
  })

  const filtered = page.items.filter((row) => row.id !== params.excludeItemId).slice(0, RECOMMENDED_LIMIT)
  if (filtered.length === 0) return []

  return gridItemsFromRows(supabase, filtered)
}

import {
  fetchMarketingCatalogItemsByIds,
  resolveItemGallerySlots,
  type MarketingCatalogGallerySlot,
} from '@/lib/catalog/marketing-catalog-items'
import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'

export type CatalogItemDetailPayload = {
  id: string
  title: string
  description: string | null
  price_points: number | null
  brand_label: string | null
  category_label: string | null
  size_label: string | null
  size_code: string | null
  color_label: string | null
  materials_label: string | null
  condition_label: string | null
  gallery: MarketingCatalogGallerySlot[]
}

export async function loadCatalogItemDetail(itemId: string): Promise<CatalogItemDetailPayload | null> {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return null

  const rows = await fetchMarketingCatalogItemsByIds([itemId])
  const row = rows[0]
  if (!row) return null

  const gallery = await resolveItemGallerySlots(supabase, row.photos)

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price_points: row.price_points,
    brand_label: row.brand_label,
    category_label: row.category_label,
    size_label: row.size_label,
    size_code: row.size_code ?? null,
    color_label: row.color_label,
    materials_label: row.materials_label,
    condition_label: row.condition_label,
    gallery,
  }
}

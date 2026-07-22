import {
  fetchMarketingCatalogItemsByIds,
  resolveItemGallerySlots,
  type MarketingCatalogGallerySlot,
} from '@/lib/catalog/marketing-catalog-items'
import {itemDimensionsEntries} from '@/lib/catalog/item-era-fitting-dimensions'
import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'

export type CatalogItemDetailPayload = {
  id: string
  title: string
  description: string | null
  price_points: number | null
  status: string | null
  brand_label: string | null
  category_label: string | null
  size_label: string | null
  size_code: string | null
  color_label: string | null
  materials_label: string | null
  condition_label: string | null
  item_category_id: string | null
  item_size_id: string | null
  item_era: string | null
  item_fitting: string | null
  item_dimensions: Array<{label: string; value: string}>
  gallery: MarketingCatalogGallerySlot[]
}

export async function loadCatalogItemDetail(itemId: string): Promise<CatalogItemDetailPayload | null> {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return null

  const rows = await fetchMarketingCatalogItemsByIds([itemId])
  const row = rows[0]
  if (!row) return null

  const gallery = await resolveItemGallerySlots(supabase, row.photos)

  const {data: extras} = await supabase
    .from('items')
    .select('item_era, item_fitting, item_dimensions')
    .eq('id', itemId)
    .maybeSingle()

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price_points: row.price_points,
    status: row.status ?? null,
    brand_label: row.brand_label,
    category_label: row.category_label,
    size_label: row.size_label,
    size_code: row.size_code ?? null,
    color_label: row.color_label,
    materials_label: row.materials_label,
    condition_label: row.condition_label,
    item_category_id: row.item_category_id,
    item_size_id: row.item_size_id,
    item_era: typeof extras?.item_era === 'string' ? extras.item_era : null,
    item_fitting: typeof extras?.item_fitting === 'string' ? extras.item_fitting : null,
    item_dimensions: itemDimensionsEntries(extras?.item_dimensions).map((d) => ({
      label: d.label,
      value: d.value,
    })),
    gallery,
  }
}

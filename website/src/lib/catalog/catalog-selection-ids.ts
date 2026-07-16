import {
  getMarketingCatalogNewestIds,
  MARKETING_CATALOG_ITEM_STATUSES,
} from '@/lib/catalog/catalog-card-badges'
import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'
import {catalogDataRevalidateSec, withDataCache} from '@/lib/sanity-cache'

/**
 * IDs des pièces marketing liées à un tag (slug), hors inventaire corporate.
 * Ordre : `item_tags.sort_order`, puis `items.created_at` desc.
 */
async function fetchMarketingCatalogItemIdsByTagSlugUncached(tagSlug: string): Promise<string[]> {
  const slug = tagSlug.trim().toLowerCase()
  if (!slug) return []

  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return []

  const {data: tag, error: tagErr} = await supabase
    .from('tags')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (tagErr) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[marketing-catalog] tag lookup', tagErr.message)
    }
    return []
  }
  if (!tag?.id) return []

  const {data: corpUsers} = await supabase.from('users').select('id').eq('status', 'corporate_inventory')
  const corpIds = (corpUsers ?? []).map((u) => u.id).filter((id): id is string => typeof id === 'string')

  const {data: links, error: linkErr} = await supabase
    .from('item_tags')
    .select('item_id, sort_order')
    .eq('tag_id', tag.id)
    .order('sort_order', {ascending: true})

  if (linkErr) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[marketing-catalog] item_tags', linkErr.message)
    }
    return []
  }

  const linkedIds = (links ?? [])
    .map((r) => r.item_id)
    .filter((id): id is string => typeof id === 'string')
  if (linkedIds.length === 0) return []

  let itemsQuery = supabase
    .from('items')
    .select('id, created_at')
    .in('id', linkedIds)
    .is('deleted_at', null)
    .in('status', [...MARKETING_CATALOG_ITEM_STATUSES])

  if (corpIds.length > 0) {
    itemsQuery = itemsQuery.not('owner_user_id', 'in', `(${corpIds.join(',')})`)
  }

  const {data: items, error: itemsErr} = await itemsQuery
  if (itemsErr) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[marketing-catalog] tag items', itemsErr.message)
    }
    return []
  }

  const sortById = new Map(
    (links ?? []).map((r) => [r.item_id as string, typeof r.sort_order === 'number' ? r.sort_order : 0]),
  )
  const createdById = new Map(
    (items ?? []).map((r) => [r.id as string, r.created_at ? String(r.created_at) : '']),
  )

  return linkedIds
    .filter((id) => createdById.has(id))
    .sort((a, b) => {
      const sa = sortById.get(a) ?? 0
      const sb = sortById.get(b) ?? 0
      if (sa !== sb) return sa - sb
      return (createdById.get(b) ?? '').localeCompare(createdById.get(a) ?? '')
    })
}

const getCachedMarketingCatalogItemIdsByTagSlug = withDataCache(
  fetchMarketingCatalogItemIdsByTagSlugUncached,
  ['marketing_catalog_tag_item_ids_v1'],
  {revalidate: catalogDataRevalidateSec()},
)

export async function getMarketingCatalogItemIdsByTagSlug(tagSlug: string): Promise<string[]> {
  return getCachedMarketingCatalogItemIdsByTagSlug(tagSlug)
}

/** IDs « New » (même pool que le badge carte), ordre `created_at` desc. */
export async function getMarketingCatalogNewItemIds(): Promise<string[]> {
  return getMarketingCatalogNewestIds()
}

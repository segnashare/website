import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'
import {catalogDataRevalidateSec, withDataCache} from '@/lib/sanity-cache'

/** Statuts catalogue marketing (aligné RPC). */
export const MARKETING_CATALOG_ITEM_STATUSES = [
  'listed',
  'available',
  'in_cart',
  'reserved',
  'sold',
] as const

/** Pièce « Sold » : achat définitif (`sold`). `reserved` = emprunt en cours. */
export function isMarketingCatalogItemSold(status: string | null | undefined): boolean {
  return status === 'sold'
}

/**
 * IDs des ~20 % de pièces marketing ajoutées en dernier (`created_at`).
 * Mis en cache ; recalcul périodique via ISR.
 */
async function fetchMarketingCatalogNewestIdsUncached(): Promise<string[]> {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return []

  const {data: corpUsers, error: corpErr} = await supabase
    .from('users')
    .select('id')
    .eq('status', 'corporate_inventory')
  if (corpErr && process.env.NODE_ENV === 'development') {
    console.error('[marketing-catalog] newness corp users', corpErr.message)
  }
  const corpIds = (corpUsers ?? []).map((u) => u.id).filter(Boolean)

  let countQuery = supabase
    .from('items')
    .select('id', {count: 'exact', head: true})
    .is('deleted_at', null)
    .in('status', [...MARKETING_CATALOG_ITEM_STATUSES])

  if (corpIds.length > 0) {
    countQuery = countQuery.not('owner_user_id', 'in', `(${corpIds.join(',')})`)
  }

  const {count, error: countErr} = await countQuery
  if (countErr) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[marketing-catalog] newness count', countErr.message)
    }
    return []
  }

  const total = typeof count === 'number' && count > 0 ? count : 0
  if (total === 0) return []

  const take = Math.max(1, Math.ceil(total * 0.2))

  let listQuery = supabase
    .from('items')
    .select('id')
    .is('deleted_at', null)
    .in('status', [...MARKETING_CATALOG_ITEM_STATUSES])
    .order('created_at', {ascending: false})
    .limit(take)

  if (corpIds.length > 0) {
    listQuery = listQuery.not('owner_user_id', 'in', `(${corpIds.join(',')})`)
  }

  const {data, error} = await listQuery
  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[marketing-catalog] newness list', error.message)
    }
    return []
  }

  return (data ?? []).map((r) => r.id).filter((id): id is string => typeof id === 'string')
}

const getCachedMarketingCatalogNewestIds = withDataCache(
  fetchMarketingCatalogNewestIdsUncached,
  ['marketing_catalog_newest_ids_v1'],
  {revalidate: catalogDataRevalidateSec()},
)

/** IDs « New » ordonnés par `created_at` desc (même pool que le badge carte). */
export async function getMarketingCatalogNewestIds(): Promise<string[]> {
  return getCachedMarketingCatalogNewestIds()
}

export async function getMarketingCatalogNewestIdSet(): Promise<Set<string>> {
  const ids = await getMarketingCatalogNewestIds()
  return new Set(ids)
}

export type CatalogCardBadgesFlags = {
  isNew: boolean
  isSold: boolean
}

export function resolveCatalogCardBadges(
  item: {id: string; status?: string | null},
  newestIds: Set<string>,
): CatalogCardBadgesFlags {
  return {
    isNew: newestIds.has(item.id),
    isSold: isMarketingCatalogItemSold(item.status),
  }
}

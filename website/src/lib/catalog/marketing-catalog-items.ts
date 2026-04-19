import {collectPhotoPathsFromItemPhotos, getFirstPhotoStoragePath} from '@/lib/catalog/item-photos'
import {createSignedUrlForStoragePath, type StorageSignClient} from '@/lib/catalog/storage-signed-url'
import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'

export type MarketingCatalogItemRow = {
  id: string
  title: string
  description: string | null
  price_points: number | null
  status: string
  photos: unknown
  item_category_id: string | null
  item_size_id: string | null
  item_brand_id: string | null
  item_couleur_id: string | null
  item_materiaux_id: string | null
  category_label: string | null
  size_label: string | null
  materials_label: string | null
  color_label: string | null
  brand_label: string | null
  condition_label: string | null
  condition_score: string | null
}

const SIGNED_TTL_SEC = 60 * 60 * 24

function parseMarketingCatalogRpcPayload(data: unknown): MarketingCatalogItemRow[] {
  const root = data && typeof data === 'object' && !Array.isArray(data) ? (data as {items?: unknown}) : {}
  const raw = root.items
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (row): row is MarketingCatalogItemRow =>
      Boolean(row) &&
      typeof row === 'object' &&
      typeof (row as MarketingCatalogItemRow).id === 'string' &&
      typeof (row as MarketingCatalogItemRow).title === 'string',
  )
}

export async function fetchMarketingCatalogItemsByIds(
  itemIds: string[],
): Promise<MarketingCatalogItemRow[]> {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase || itemIds.length === 0) return []

  const {data, error} = await supabase.rpc('get_marketing_website_catalog_items_by_ids', {
    p_item_ids: itemIds,
  })
  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[marketing-catalog]', error.message)
    }
    return []
  }
  return parseMarketingCatalogRpcPayload(data)
}

/** Liste catalogue public (site marketing), jusqu’à 500 pièces côté SQL. */
export async function fetchMarketingCatalogItemsFull(limit = 200): Promise<MarketingCatalogItemRow[]> {
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return []

  const {data, error} = await supabase.rpc('get_marketing_website_catalog_items', {
    p_limit: limit,
  })
  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[marketing-catalog] get_marketing_website_catalog_items', error.message)
    }
    return []
  }
  return parseMarketingCatalogRpcPayload(data)
}

export async function resolveCoverUrlsForItems(
  supabase: StorageSignClient,
  rows: MarketingCatalogItemRow[],
  chunkSize = 14,
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>()
  for (let i = 0; i < rows.length; i += chunkSize) {
    const slice = rows.slice(i, i + chunkSize)
    const pairs = await Promise.all(
      slice.map(async (r) => {
        const url = await resolveItemCoverSignedUrl(supabase, r.photos)
        return [r.id, url] as const
      }),
    )
    for (const [id, url] of pairs) map.set(id, url)
  }
  return map
}

export async function signPhotoPaths(
  supabase: StorageSignClient,
  paths: string[],
): Promise<(string | null)[]> {
  const out: (string | null)[] = []
  for (const p of paths) {
    out.push(await createSignedUrlForStoragePath(supabase, p, SIGNED_TTL_SEC))
  }
  return out
}

export async function resolveItemCoverSignedUrl(
  supabase: StorageSignClient,
  photos: unknown,
): Promise<string | null> {
  const first = getFirstPhotoStoragePath(photos)
  if (!first) return null
  return createSignedUrlForStoragePath(supabase, first, SIGNED_TTL_SEC)
}

export async function resolveItemGallerySignedUrls(
  supabase: StorageSignClient,
  photos: unknown,
): Promise<string[]> {
  const paths = collectPhotoPathsFromItemPhotos(photos)
  const signed = await signPhotoPaths(supabase, paths)
  return signed.filter((u): u is string => Boolean(u))
}

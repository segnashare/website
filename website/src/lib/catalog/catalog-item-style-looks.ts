import {createSignedUrlForStoragePath} from '@/lib/catalog/storage-signed-url'
import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'

const SIGNED_TTL_SEC = 60 * 60 * 24

export type CatalogItemLookMedia = {
  lookId: string
  title: string
  mediaType: 'photo' | 'video' | 'dump'
  /** Première photo ou vidéo signée. */
  url: string
  /** Affiche pour vidéo si dispo (sinon le lecteur utilise `url`). */
  posterUrl: string | null
}

type StyleLookRow = {
  id: string
  title: string | null
  media_type: string | null
  presentation_storage_bucket: string | null
  media_paths: unknown
  presentation_storage_path: string | null
  video_poster_path: string | null
  sort_order: number | null
  published_at: string | null
  created_at: string | null
}

function parseMediaPaths(value: unknown, fallbackPath: string | null): string[] {
  const fromArray = Array.isArray(value)
    ? value.map((entry) => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean)
    : []
  if (fromArray.length > 0) return fromArray
  const legacy = fallbackPath?.trim()
  return legacy ? [legacy] : []
}

function parseMediaType(value: unknown): 'photo' | 'video' | 'dump' {
  if (value === 'video' || value === 'dump') return value
  return 'photo'
}

/** Looks publiés liés à la pièce, avec la 1ʳᵉ media signée (service_role). */
export async function loadCatalogItemStyleLooks(itemId: string): Promise<CatalogItemLookMedia[]> {
  const id = itemId.trim()
  if (!id) return []

  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return []

  const {data, error} = await supabase
    .from('style_looks')
    .select(
      `
      id,
      title,
      media_type,
      presentation_storage_bucket,
      media_paths,
      presentation_storage_path,
      video_poster_path,
      sort_order,
      published_at,
      created_at,
      style_look_items!inner(item_id)
    `,
    )
    .eq('published', true)
    .eq('style_look_items.item_id', id)
    .order('sort_order', {ascending: true})
    .order('published_at', {ascending: false, nullsFirst: false})
    .order('created_at', {ascending: false})

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[catalog-item-style-looks]', error.message)
    }
    return []
  }

  const rows = (data ?? []) as StyleLookRow[]
  const out: CatalogItemLookMedia[] = []

  for (const row of rows) {
    const lookId = typeof row.id === 'string' ? row.id.trim() : ''
    if (!lookId) continue

    const mediaType = parseMediaType(row.media_type)
    const bucket =
      typeof row.presentation_storage_bucket === 'string' && row.presentation_storage_bucket.trim()
        ? row.presentation_storage_bucket.trim()
        : 'bucket_cms_app'
    const paths = parseMediaPaths(row.media_paths, row.presentation_storage_path)
    const firstPath = paths[0]
    if (!firstPath) continue

    const url = await createSignedUrlForStoragePath(supabase, firstPath, SIGNED_TTL_SEC, {
      explicitBucket: bucket,
    })
    if (!url) continue

    let posterUrl: string | null = null
    if (typeof row.video_poster_path === 'string' && row.video_poster_path.trim()) {
      posterUrl = await createSignedUrlForStoragePath(supabase, row.video_poster_path, SIGNED_TTL_SEC, {
        explicitBucket: bucket,
      })
    }

    out.push({
      lookId,
      title: typeof row.title === 'string' ? row.title.trim() : '',
      mediaType,
      url,
      posterUrl,
    })
  }

  return out
}

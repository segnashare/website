const BUCKET_ITEMS = 'bucket_items'
const BUCKET_FOCUS = 'bucket_focus'
const BUCKET_CMS_APP = 'bucket_cms_app'

export function normalizeStorageObjectPath(raw: string): string {
  let p = raw.trim().replace(/^\/+/, '')
  const lower = p.toLowerCase()
  if (lower.startsWith(`${BUCKET_ITEMS}/`)) p = p.slice(BUCKET_ITEMS.length + 1)
  else if (lower.startsWith(`${BUCKET_FOCUS}/`)) p = p.slice(BUCKET_FOCUS.length + 1)
  else if (lower.startsWith(`${BUCKET_CMS_APP}/`)) p = p.slice(BUCKET_CMS_APP.length + 1)
  return p
}

export function orderedBucketsForStoragePath(normalizedPath: string): readonly string[] {
  const pl = normalizedPath.toLowerCase()
  if (pl.startsWith('cms-app/') || pl.includes('/cms-app/')) return [BUCKET_CMS_APP]
  if (pl.includes('/items/')) return [BUCKET_ITEMS]
  if (pl.includes('/looks/') || pl.includes('/profile/')) return [BUCKET_FOCUS]
  return [BUCKET_ITEMS, BUCKET_FOCUS]
}

export type StorageSignClient = {
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (
        path: string,
        expiresIn: number,
      ) => Promise<{data?: {signedUrl?: string} | null; error?: {message?: string} | null}>
    }
  }
}

export async function createSignedUrlForStoragePath(
  supabase: StorageSignClient,
  rawPath: string,
  expiresIn: number,
): Promise<string | null> {
  const trimmed = rawPath.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const objectPath = normalizeStorageObjectPath(rawPath)
  if (!objectPath) return null
  const buckets = orderedBucketsForStoragePath(objectPath)
  for (const bucketId of buckets) {
    const {data, error} = await supabase.storage.from(bucketId).createSignedUrl(objectPath, expiresIn)
    if (!error && data?.signedUrl) return data.signedUrl
  }
  return null
}

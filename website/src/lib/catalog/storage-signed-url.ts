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
    from(bucket: string): {
      createSignedUrl(
        path: string,
        expiresIn: number,
      ): Promise<{data?: {signedUrl?: string} | null; error?: {message?: string} | null}>
    }
  }
}

async function signObjectInBucket(
  supabase: StorageSignClient,
  bucketId: string,
  objectPath: string,
  expiresIn: number,
): Promise<string | null> {
  const {data, error} = await supabase.storage.from(bucketId).createSignedUrl(objectPath, expiresIn)
  if (!error && data?.signedUrl) return data.signedUrl
  return null
}

/**
 * `createSignedUrl` ne vérifie pas que l’objet existe : un chemin stale
 * (`photo_1.jpg` après recadrage Photoroom) produit une URL qui 404 au fetch.
 * HEAD : 200 + image/* si présent, 400 + JSON `not_found` sinon.
 */
export async function signedStorageImageIsMissing(url: string): Promise<boolean> {
  if (!url || !/^https?:\/\//i.test(url)) return false
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(4_000),
    })
    if (res.ok) {
      const ct = res.headers.get('content-type') ?? ''
      return ct.includes('application/json')
    }
    return res.status === 400 || res.status === 404
  } catch {
    return false
  }
}

export async function createSignedUrlForStoragePath(
  supabase: StorageSignClient,
  rawPath: string,
  expiresIn: number,
  options?: {explicitBucket?: string | null},
): Promise<string | null> {
  const trimmed = rawPath.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const objectPath = normalizeStorageObjectPath(rawPath)
  if (!objectPath) return null
  const explicit = options?.explicitBucket?.trim()
  const buckets = explicit
    ? [explicit, ...orderedBucketsForStoragePath(objectPath).filter((b) => b !== explicit)]
    : orderedBucketsForStoragePath(objectPath)
  for (const bucketId of buckets) {
    const signed = await signObjectInBucket(supabase, bucketId, objectPath, expiresIn)
    if (signed) return signed
  }
  return null
}

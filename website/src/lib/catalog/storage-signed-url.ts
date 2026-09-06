const BUCKET_ITEMS = 'bucket_items'
const BUCKET_FOCUS = 'bucket_focus'
const BUCKET_CMS_APP = 'bucket_cms_app'

/**
 * Resize côté Storage pour les covers catalogue (cartes ~150–350px).
 * Évite de livrer les JPEG appareil photo multi‑Mo ; fallback plein original si transform KO.
 */
export type StorageImageTransform = {
  width?: number
  height?: number
  quality?: number
  resize?: 'cover' | 'contain' | 'fill'
  /** Forcer webp : les PNG Photoroom restent ~1 Mo en `origin` et bloquent le marquee. */
  format?: 'origin' | 'webp'
}

/** Covers bandeaux / grille — assez pour retina sur carte small/large. */
export const CATALOG_CARD_COVER_TRANSFORM: StorageImageTransform = {
  width: 768,
  quality: 70,
  resize: 'contain',
  format: 'webp',
}

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
    /** Syntaxe méthode : paramètres bivariants, compatible client Supabase + `{format:'webp'}`. */
    from(bucket: string): {
      createSignedUrl(
        path: string,
        expiresIn: number,
        options?: {transform?: StorageImageTransform},
      ): Promise<{data?: {signedUrl?: string} | null; error?: {message?: string} | null}>
    }
  }
}

async function signObjectInBucket(
  supabase: StorageSignClient,
  bucketId: string,
  objectPath: string,
  expiresIn: number,
  transform?: StorageImageTransform | null,
): Promise<string | null> {
  const {data, error} = await supabase.storage
    .from(bucketId)
    .createSignedUrl(objectPath, expiresIn, transform ? {transform} : undefined)
  if (!error && data?.signedUrl) return data.signedUrl
  // Transform endpoint can fail on some assets — fall back to full original.
  if (transform) {
    return signObjectInBucket(supabase, bucketId, objectPath, expiresIn, null)
  }
  return null
}

export async function createSignedUrlForStoragePath(
  supabase: StorageSignClient,
  rawPath: string,
  expiresIn: number,
  options?: {explicitBucket?: string | null; transform?: StorageImageTransform | null},
): Promise<string | null> {
  const trimmed = rawPath.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const objectPath = normalizeStorageObjectPath(rawPath)
  if (!objectPath) return null
  const explicit = options?.explicitBucket?.trim()
  const buckets = explicit
    ? [explicit, ...orderedBucketsForStoragePath(objectPath).filter((b) => b !== explicit)]
    : orderedBucketsForStoragePath(objectPath)
  const transform = options?.transform ?? null
  for (const bucketId of buckets) {
    const signed = await signObjectInBucket(supabase, bucketId, objectPath, expiresIn, transform)
    if (signed) return signed
  }
  return null
}

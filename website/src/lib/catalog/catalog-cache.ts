/**
 * Cache catalogue vs URLs signées Storage.
 *
 * Les payloads (API / ISR) embarquent des signed URLs : le cache HTTP/Data
 * doit toujours être nettement plus court que `SIGNED_URL_TTL_SEC`, sinon le
 * navigateur reçoit des tokens déjà expirés → images cassées.
 */

/** Durée de vie des URLs signées Supabase Storage. */
export const SIGNED_URL_TTL_SEC = 86_400 // 24 h

/**
 * Revalidation du cache Data (`unstable_cache`) des signed URLs.
 * Doit rester ≪ TTL pour re-signer avant expiration.
 */
export const SIGNED_URL_CACHE_REVALIDATE_SEC = 3_600 // 1 h

/** Cache CDN / `Cache-Control` des API qui renvoient des signed URLs. */
export const CATALOG_CDN_MAX_AGE_SEC = 3_600 // 1 h

/** Fenêtre stale-while-revalidate (toujours sous le TTL restant après max-age). */
export const CATALOG_CDN_STALE_WHILE_REVALIDATE_SEC = 1_800 // 30 min

/** ISR pages catalogue qui embarquent des coverUrl signées. */
export const CATALOG_ISR_REVALIDATE_SEC = 3_600 // 1 h

/**
 * Tag Data Cache pour purger covers + rows catalogue
 * (indépendant de Sanity — déclenché depuis le BO après update photo).
 */
export const CATALOG_CACHE_TAG = 'marketing-catalog'

export const catalogApiCacheHeaders = {
  'Cache-Control': `public, s-maxage=${CATALOG_CDN_MAX_AGE_SEC}, stale-while-revalidate=${CATALOG_CDN_STALE_WHILE_REVALIDATE_SEC}`,
} as const

/** Cache CDN catalogue (filtres client + API) — invalidation via redeploy ou webhook futur Supabase. */
export const CATALOG_CDN_MAX_AGE_SEC = 86_400

/** ISR pages catalogue (sans searchParams → une entrée cache par chemin). */
export const CATALOG_ISR_REVALIDATE_SEC = 86_400

export const catalogApiCacheHeaders = {
  'Cache-Control': `public, s-maxage=${CATALOG_CDN_MAX_AGE_SEC}, stale-while-revalidate=604800`,
} as const

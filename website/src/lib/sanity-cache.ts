import {unstable_cache} from 'next/cache'

export const SANITY_CACHE_TAG = 'sanity-cms'

/** En local : données fraîches à chaque requête (sauf si SANITY_DEV_CACHE=true). */
export function isDevFreshData(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.SANITY_DEV_CACHE !== 'true'
}

/** Durée max sans webhook (sec). 1 h en prod ; 0 en dev pour rechargement immédiat. */
export const SANITY_DATA_REVALIDATE_SEC = isDevFreshData() ? 0 : 3600

/** ISR pages marketing — aligné sur le cache données Sanity. */
export const CMS_ISR_REVALIDATE_SEC = SANITY_DATA_REVALIDATE_SEC

export const sanityCacheOptions = {
  revalidate: SANITY_DATA_REVALIDATE_SEC,
  tags: [SANITY_CACHE_TAG],
}

export type DataCacheOptions = {
  revalidate?: number
  tags?: string[]
}

/** Contourne `unstable_cache` en dev pour voir tout de suite les publications Sanity / redeploys. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withDataCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyParts: string[],
  options: DataCacheOptions = sanityCacheOptions,
): T {
  if (isDevFreshData()) {
    return fn
  }
  return unstable_cache(fn, keyParts, {
    revalidate: options.revalidate ?? SANITY_DATA_REVALIDATE_SEC,
    tags: options.tags ?? [SANITY_CACHE_TAG],
  }) as unknown as T
}

export function catalogDataRevalidateSec(): number {
  return isDevFreshData() ? 0 : 3600
}

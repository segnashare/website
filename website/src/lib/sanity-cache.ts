import {unstable_cache} from 'next/cache'

export const SANITY_CACHE_TAG = 'sanity-cms'

/** En local : données fraîches à chaque requête (sauf si SANITY_DEV_CACHE=true). */
export function isDevFreshData(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.SANITY_DEV_CACHE !== 'true'
}

/** Durée ISR pages marketing (constante littérale — requis pour `export const revalidate`). */
export const CMS_ISR_REVALIDATE_SEC = 3600

export const sanityCacheOptions = {
  revalidate: CMS_ISR_REVALIDATE_SEC,
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
    revalidate: options.revalidate ?? CMS_ISR_REVALIDATE_SEC,
    tags: options.tags ?? [SANITY_CACHE_TAG],
  }) as unknown as T
}

export function catalogDataRevalidateSec(): number {
  return isDevFreshData() ? 0 : 86_400
}

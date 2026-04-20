/**
 * Mesure du chargement catalogue (RSC).
 *
 * - **Résumé** (`loadCatalogBrowseFromPath`) : automatique en `NODE_ENV=development`,
 *   ou si `CATALOG_PERF_DEBUG=1`.
 * - **Détail** (RPC facettes, RPC page, lots de signatures Storage) : uniquement avec
 *   `CATALOG_PERF_DEBUG=1` ou `NEXT_PUBLIC_CATALOG_PERF_DEBUG=1`.
 */

export function catalogPerfDetail(): boolean {
  return process.env.CATALOG_PERF_DEBUG === '1' || process.env.NEXT_PUBLIC_CATALOG_PERF_DEBUG === '1'
}

export function catalogPerfEnabled(): boolean {
  return process.env.NODE_ENV === 'development' || catalogPerfDetail()
}

export function catalogPerfNow(): number {
  return typeof globalThis.performance?.now === 'function' ? globalThis.performance.now() : Date.now()
}

export function catalogPerfLog(message: string, payload: Record<string, unknown>): void {
  if (!catalogPerfEnabled()) return
  console.info(`[catalog-perf] ${message}`, payload)
}

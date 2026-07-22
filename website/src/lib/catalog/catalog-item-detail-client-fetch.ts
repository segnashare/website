import type {CatalogItemDetailPayload} from '@/lib/catalog/catalog-item-detail'

/**
 * Ne pas utiliser `force-cache` : les galeries embarquent des signed URLs
 * (TTL 24 h). Un cache navigateur “force” peut renvoyer des tokens expirés.
 * On s’appuie sur le `Cache-Control` court de l’API (`catalogApiCacheHeaders`).
 */
export async function fetchCatalogItemDetailClient(itemId: string): Promise<CatalogItemDetailPayload> {
  const res = await fetch(`/api/marketing/catalog/item/${encodeURIComponent(itemId)}`, {
    cache: 'default',
  })
  if (!res.ok) throw new Error(String(res.status))
  return (await res.json()) as CatalogItemDetailPayload
}

/** Précharge le détail au survol (best-effort, sans erreur remontée). */
export function prefetchCatalogItemDetailClient(itemId: string): void {
  void fetchCatalogItemDetailClient(itemId).catch(() => undefined)
}

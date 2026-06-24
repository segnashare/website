import type {CatalogItemDetailPayload} from '@/lib/catalog/catalog-item-detail'

export async function fetchCatalogItemDetailClient(itemId: string): Promise<CatalogItemDetailPayload> {
  const res = await fetch(`/api/marketing/catalog/item/${encodeURIComponent(itemId)}`, {cache: 'force-cache'})
  if (!res.ok) throw new Error(String(res.status))
  return (await res.json()) as CatalogItemDetailPayload
}

/** Précharge le détail au survol (best-effort, sans erreur remontée). */
export function prefetchCatalogItemDetailClient(itemId: string): void {
  void fetchCatalogItemDetailClient(itemId).catch(() => undefined)
}

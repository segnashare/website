import {slugifyFr} from '@/lib/catalog/catalog-slugs'

export const CATALOG_AVAILABILITY_OPTIONS = [
  {id: 'disponible' as const, label: 'Disponible'},
  {id: 'reserve' as const, label: 'Réservé'},
  {id: 'vendu' as const, label: 'Vendu'},
]

export type CatalogAvailabilityId = (typeof CATALOG_AVAILABILITY_OPTIONS)[number]['id']

export function parseAvailabilitySlugs(raw: string[]): CatalogAvailabilityId[] {
  const out: CatalogAvailabilityId[] = []
  for (const s of raw) {
    const slug = slugifyFr(s)
    if (slug === 'disponible' || slug === 'disponibles') out.push('disponible')
    else if (slug === 'reserve' || slug === 'reserves') out.push('reserve')
    else if (slug === 'vendu' || slug === 'vendus' || slug === 'sold') out.push('vendu')
  }
  return [...new Set(out)]
}

/**
 * — Disponible : `available` / `listed`
 * — Réservé : `in_cart` (panier) ou `reserved` (emprunt)
 * — Vendu : `sold` (achat définitif)
 */
export function itemMatchesAvailabilityFilter(
  item: {id: string; status?: string | null},
  availabilitySlugs: readonly string[],
): boolean {
  if (availabilitySlugs.length === 0) return true
  const wanted = parseAvailabilitySlugs([...availabilitySlugs])
  if (wanted.length === 0) return true
  const status = item.status ?? ''
  return wanted.some((id) => {
    if (id === 'disponible') return status === 'available' || status === 'listed'
    if (id === 'reserve') return status === 'in_cart' || status === 'reserved'
    if (id === 'vendu') return status === 'sold'
    return false
  })
}

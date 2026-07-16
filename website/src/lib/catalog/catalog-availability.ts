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
 * — Réservé : `in_cart` (panier) / `reserved` (emprunt)
 * — Vendu : `sold` (achat définitif — badge Sold)
 */
export function itemStatusesForAvailability(availabilitySlugs: readonly string[]): string[] {
  const wanted = parseAvailabilitySlugs([...availabilitySlugs])
  const statuses = new Set<string>()
  for (const id of wanted) {
    if (id === 'disponible') {
      statuses.add('available')
      statuses.add('listed')
    } else if (id === 'reserve') {
      statuses.add('in_cart')
      statuses.add('reserved')
    } else if (id === 'vendu') {
      statuses.add('sold')
    }
  }
  return [...statuses]
}

export function itemMatchesAvailabilityFilter(
  item: {id: string; status?: string | null},
  availabilitySlugs: readonly string[],
): boolean {
  if (availabilitySlugs.length === 0) return true
  const statuses = itemStatusesForAvailability(availabilitySlugs)
  if (statuses.length === 0) return true
  return statuses.includes(item.status ?? '')
}

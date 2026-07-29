/** Autocomplete adresses France — même source que l’app (`api-adresse.data.gouv.fr`). */

export type BanAddressSuggestion = {
  id: string
  /** Libellé complet BAN (rue, CP ville). */
  label: string
  /** Numéro + voie uniquement (ex. « 9 Villa Compoint »). */
  street: string
  secondary: string
  hasStreet: boolean
  city: string | null
  postcode: string | null
  /** Région (ex. « Île-de-France »), depuis le context BAN. */
  region: string | null
  relativeCity: string | null
  timezone: string
  lat: number
  lon: number
}

/** Context BAN : « 75, Paris, Île-de-France » → région = dernier segment. */
function regionFromBanContext(context: string | undefined): string | null {
  if (!context?.trim()) return null
  const parts = context.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return null
  const last = parts[parts.length - 1]!
  // Évite de renvoyer un code département seul
  if (/^\d{2,3}$/.test(last)) return null
  return last
}

type AdresseApiFeature = {
  properties: {
    id: string
    label: string
    name: string
    type?: string
    city?: string
    postcode?: string
    context?: string
  }
  geometry: {coordinates: [number, number]}
}

function formatArrondissementLabel(cityLabel: string, arrondissement: number) {
  const ordinal = arrondissement === 1 ? '1er' : `${arrondissement}e`
  return `${cityLabel} ${ordinal} arrondissement`
}

export function toBanAddressSuggestion(feature: AdresseApiFeature): BanAddressSuggestion {
  const [lon, lat] = feature.geometry.coordinates
  const cityPart = [feature.properties.postcode, feature.properties.city].filter(Boolean).join(' ')
  const secondary = feature.properties.context ? `${cityPart} - ${feature.properties.context}` : cityPart
  const primaryLabel = feature.properties.name?.trim()
  const label = primaryLabel && cityPart ? `${primaryLabel}, ${cityPart}` : feature.properties.label
  const lowerName = (feature.properties.name ?? '').toLowerCase()
  const hasStreetKeyword =
    /(rue|avenue|av\.|boulevard|bd\.|chemin|allee|all[ée]e|impasse|place|route|quai|villa|passage)\b/.test(
      lowerName,
    )
  const hasStreet =
    feature.properties.type === 'housenumber' ||
    feature.properties.type === 'street' ||
    hasStreetKeyword
  const postcode = feature.properties.postcode ?? ''
  const city = feature.properties.city ?? null

  let relativeCity: string | null = city
  if (city) {
    if (/^Paris$/i.test(city) && /^750(0[1-9]|1[0-9]|20)$/.test(postcode)) {
      relativeCity = formatArrondissementLabel('Paris', Number(postcode.slice(3)))
    } else if (/^Lyon$/i.test(city) && /^6900[1-9]$/.test(postcode)) {
      relativeCity = formatArrondissementLabel('Lyon', Number(postcode.slice(3)))
    } else if (/^Marseille$/i.test(city) && /^130(0[1-9]|1[0-6])$/.test(postcode)) {
      relativeCity = formatArrondissementLabel('Marseille', Number(postcode.slice(3)))
    }
  }

  return {
    id: feature.properties.id,
    label,
    street: primaryLabel || feature.properties.label,
    secondary,
    hasStreet,
    city,
    postcode: postcode || null,
    region: regionFromBanContext(feature.properties.context),
    relativeCity,
    timezone: 'Europe/Paris',
    lat,
    lon,
  }
}

export async function searchBanAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<BanAddressSuggestion[]> {
  const q = query.trim()
  if (q.length < 3) return []

  const response = await fetch(
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=7&autocomplete=1`,
    {signal},
  )
  if (!response.ok) return []

  const data = (await response.json()) as {features?: AdresseApiFeature[]}
  return (data.features ?? []).map(toBanAddressSuggestion)
}

export function isBanAddressSelectionValid(
  query: string,
  selected: BanAddressSuggestion | null,
): boolean {
  return (
    selected !== null &&
    selected.hasStreet &&
    query.trim() === selected.label &&
    query.includes(',')
  )
}

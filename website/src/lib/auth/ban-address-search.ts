/** Autocomplete adresses France — même source que l’app (`api-adresse.data.gouv.fr`). */

export type BanAddressSuggestion = {
  id: string
  label: string
  secondary: string
  hasStreet: boolean
  city: string | null
  relativeCity: string | null
  timezone: string
  lat: number
  lon: number
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
    secondary,
    hasStreet,
    city,
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

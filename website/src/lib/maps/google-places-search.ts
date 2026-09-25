import {
  relativeCityFromPostcode,
  type BanAddressSuggestion,
} from '@/lib/auth/ban-address-search'

const GOOGLE_PLACES_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY?.trim() ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY?.trim() ||
  null

const STREET_TYPES = new Set([
  'street_address',
  'premise',
  'subpremise',
  'route',
  'street_number',
  'geocode',
])

type PlacesAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string
      types?: string[]
      text?: {text?: string}
      structuredFormat?: {
        mainText?: {text?: string}
        secondaryText?: {text?: string}
      }
    }
  }>
}

type PlaceComponent = {
  longText?: string
  shortText?: string
  types?: string[]
}

type PlaceDetailsResponse = {
  id?: string
  formattedAddress?: string
  location?: {latitude?: number; longitude?: number}
  addressComponents?: PlaceComponent[]
}

let sessionToken = ''

function getSessionToken() {
  if (!sessionToken && typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    sessionToken = crypto.randomUUID()
  }
  if (!sessionToken) sessionToken = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return sessionToken
}

function resetSessionToken() {
  sessionToken = ''
}

function componentOf(components: PlaceComponent[] | undefined, type: string) {
  return components?.find((c) => c.types?.includes(type))?.longText?.trim() || null
}

function hasStreetFromTypes(types: string[] | undefined) {
  return Boolean(types?.some((type) => STREET_TYPES.has(type)))
}

export function hasGooglePlacesKey() {
  return Boolean(GOOGLE_PLACES_API_KEY)
}

export async function searchGooglePlacePredictions(
  query: string,
  signal?: AbortSignal,
): Promise<BanAddressSuggestion[]> {
  const q = query.trim()
  if (!GOOGLE_PLACES_API_KEY || q.length < 3) return []

  const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask':
        'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types',
    },
    body: JSON.stringify({
      input: q,
      languageCode: 'fr',
      includedRegionCodes: ['fr'],
      sessionToken: getSessionToken(),
    }),
  })
  if (!response.ok) return []

  const data = (await response.json()) as PlacesAutocompleteResponse
  return (data.suggestions ?? [])
    .map((row) => {
      const prediction = row.placePrediction
      const placeId = prediction?.placeId?.trim()
      if (!placeId) return null
      const street = prediction.structuredFormat?.mainText?.text?.trim() || prediction.text?.text?.trim() || q
      const secondary = prediction.structuredFormat?.secondaryText?.text?.trim() || ''
      const label = prediction.text?.text?.trim() || [street, secondary].filter(Boolean).join(', ')
      return {
        id: placeId,
        placeId,
        label,
        street,
        secondary,
        hasStreet: hasStreetFromTypes(prediction.types) || /[0-9]/.test(street),
        city: null,
        postcode: null,
        region: null,
        relativeCity: null,
        timezone: 'Europe/Paris',
        lat: Number.NaN,
        lon: Number.NaN,
      } satisfies BanAddressSuggestion
    })
    .filter((row): row is BanAddressSuggestion => Boolean(row))
}

export async function resolveGooglePlaceDetails(
  placeId: string,
  signal?: AbortSignal,
): Promise<BanAddressSuggestion | null> {
  const id = placeId.trim()
  if (!GOOGLE_PLACES_API_KEY || !id) return null

  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`)
  url.searchParams.set('languageCode', 'fr')
  url.searchParams.set('sessionToken', getSessionToken())

  const response = await fetch(url.toString(), {
    signal,
    headers: {
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': 'id,formattedAddress,location,addressComponents',
    },
  })
  resetSessionToken()
  if (!response.ok) return null

  const data = (await response.json()) as PlaceDetailsResponse
  const lat = data.location?.latitude
  const lon = data.location?.longitude
  if (typeof lat !== 'number' || typeof lon !== 'number') return null

  const streetNumber = componentOf(data.addressComponents, 'street_number')
  const route = componentOf(data.addressComponents, 'route')
  const city =
    componentOf(data.addressComponents, 'locality') ||
    componentOf(data.addressComponents, 'postal_town')
  const postcode = componentOf(data.addressComponents, 'postal_code')
  const region = componentOf(data.addressComponents, 'administrative_area_level_1')
  const street = [streetNumber, route].filter(Boolean).join(' ').trim()
  const cityPart = [postcode, city].filter(Boolean).join(' ')
  const label =
    street && cityPart ? `${street}, ${cityPart}` : data.formattedAddress?.trim() || street || cityPart
  const hasStreet = Boolean(streetNumber || route)

  return {
    id: data.id || id,
    placeId: id,
    label,
    street: street || label,
    secondary: [cityPart, region].filter(Boolean).join(' - '),
    hasStreet,
    city,
    postcode,
    region,
    relativeCity: relativeCityFromPostcode(city, postcode),
    timezone: 'Europe/Paris',
    lat,
    lon,
  }
}

export function needsGooglePlaceDetails(suggestion: BanAddressSuggestion) {
  return Boolean(suggestion.placeId) && (!Number.isFinite(suggestion.lat) || !Number.isFinite(suggestion.lon))
}

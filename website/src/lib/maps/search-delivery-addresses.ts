import {searchBanAddresses, type BanAddressSuggestion} from '@/lib/auth/ban-address-search'
import {
  hasGooglePlacesKey,
  needsGooglePlaceDetails,
  resolveGooglePlaceDetails,
  searchGooglePlacePredictions,
} from '@/lib/maps/google-places-search'

/** Autocomplete adresse : Google Places d’abord, BAN en secours. */
export async function searchDeliveryAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<BanAddressSuggestion[]> {
  if (hasGooglePlacesKey()) {
    try {
      const places = await searchGooglePlacePredictions(query, signal)
      if (places.length > 0) return places
    } catch (error) {
      if (signal?.aborted) throw error
    }
  }
  return searchBanAddresses(query, signal)
}

export async function resolveDeliveryAddressSelection(
  suggestion: BanAddressSuggestion,
  signal?: AbortSignal,
): Promise<BanAddressSuggestion> {
  if (!needsGooglePlaceDetails(suggestion)) return suggestion
  const detailed = await resolveGooglePlaceDetails(suggestion.placeId!, signal)
  return detailed ?? suggestion
}

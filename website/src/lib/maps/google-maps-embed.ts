const DEFAULT_CENTER = {lat: 48.8566, lon: 2.3522}
const MAP_DELTA = 0.18

const GOOGLE_MAPS_EMBED_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY?.trim() || null

export function getDefaultMapCenter() {
  return DEFAULT_CENTER
}

function buildOpenStreetMapEmbedSrc(lat: number, lon: number) {
  const left = lon - MAP_DELTA
  const right = lon + MAP_DELTA
  const top = lat + MAP_DELTA
  const bottom = lat - MAP_DELTA
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lon}`
}

function buildGoogleMapsEmbedSrc(lat: number, lon: number) {
  if (!GOOGLE_MAPS_EMBED_API_KEY) return null
  const url = new URL('https://www.google.com/maps/embed/v1/place')
  url.searchParams.set('key', GOOGLE_MAPS_EMBED_API_KEY)
  url.searchParams.set('q', `${lat},${lon}`)
  url.searchParams.set('zoom', '15')
  url.searchParams.set('maptype', 'roadmap')
  return url.toString()
}

export function buildMapEmbedSrc(lat: number, lon: number) {
  return buildGoogleMapsEmbedSrc(lat, lon) ?? buildOpenStreetMapEmbedSrc(lat, lon)
}

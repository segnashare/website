/** Origines Sanity Studio autorisées à lire les APIs catalogue (pickers CMS). */
const STUDIO_ORIGINS = [
  'http://localhost:3333',
  'http://127.0.0.1:3333',
  'https://segna-website.sanity.studio',
  'https://www.segnashare.com',
  'https://segnashare.com',
  'https://www.sanity.io',
  'https://sanity.io',
]

function isStudioOrigin(origin: string): boolean {
  if (!origin) return false
  if (STUDIO_ORIGINS.includes(origin)) return true
  try {
    const {hostname, protocol} = new URL(origin)
    if (protocol !== 'http:' && protocol !== 'https:') return false
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true
    if (hostname === 'sanity.io' || hostname.endsWith('.sanity.io')) return true
    if (hostname.endsWith('.sanity.studio')) return true
    return false
  } catch {
    return false
  }
}

export function studioPickerCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('origin') ?? ''
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
  if (isStudioOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

/** Clé sessionStorage pour mémoriser la destination post-OAuth website. */
export const WEBSITE_AUTH_NEXT_STORAGE_KEY = 'segna_website_auth_next'
export const WEBSITE_OAUTH_PENDING_COOKIE = 'segna_website_oauth_pending'
export const WEBSITE_AUTH_NEXT_COOKIE = 'segna_website_auth_next'

const OAUTH_NEXT_MAX_AGE_SEC = 60 * 10

function isSafeNextPath(path: string): boolean {
  const trimmed = path.trim()
  return trimmed.startsWith('/') && !trimmed.startsWith('//')
}

function cookieDomainSuffix(): string {
  if (typeof window === 'undefined') return ''
  const host = window.location.hostname.toLowerCase()
  if (host === 'segnashare.com' || host.endsWith('.segnashare.com')) {
    return '; domain=.segnashare.com'
  }
  return ''
}

function writeCookie(name: string, value: string, maxAgeSec: number): void {
  if (typeof document === 'undefined') return
  const encoded = encodeURIComponent(value)
  document.cookie = `${name}=${encoded}; path=/; max-age=${maxAgeSec}; SameSite=Lax${cookieDomainSuffix()}`
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const prefix = `${name}=`
  const parts = document.cookie.split(';')
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed.startsWith(prefix)) continue
    try {
      return decodeURIComponent(trimmed.slice(prefix.length))
    } catch {
      return trimmed.slice(prefix.length)
    }
  }
  return null
}

function clearCookie(name: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${cookieDomainSuffix()}`
}

/** Mémorise la destination (sessionStorage + cookie cross-www). */
export function storeWebsiteAuthNext(path: string): void {
  if (!isSafeNextPath(path)) return
  const trimmed = path.trim()
  try {
    window.sessionStorage.setItem(WEBSITE_AUTH_NEXT_STORAGE_KEY, trimmed)
  } catch {
    // ignore (private mode, etc.)
  }
  writeCookie(WEBSITE_AUTH_NEXT_COOKIE, trimmed, OAUTH_NEXT_MAX_AGE_SEC)
  writeCookie(WEBSITE_OAUTH_PENDING_COOKIE, '1', OAUTH_NEXT_MAX_AGE_SEC)
}

export function readWebsiteAuthNext(): string | null {
  try {
    const fromStorage = window.sessionStorage.getItem(WEBSITE_AUTH_NEXT_STORAGE_KEY)
    if (fromStorage && isSafeNextPath(fromStorage)) return fromStorage.trim()
  } catch {
    // ignore
  }
  const fromCookie = readCookie(WEBSITE_AUTH_NEXT_COOKIE)
  if (fromCookie && isSafeNextPath(fromCookie)) return fromCookie.trim()
  return null
}

export function isWebsiteOAuthPending(): boolean {
  return readCookie(WEBSITE_OAUTH_PENDING_COOKIE) === '1'
}

export function clearWebsiteAuthNext(): void {
  try {
    window.sessionStorage.removeItem(WEBSITE_AUTH_NEXT_STORAGE_KEY)
  } catch {
    // ignore
  }
  clearCookie(WEBSITE_AUTH_NEXT_COOKIE)
  clearCookie(WEBSITE_OAUTH_PENDING_COOKIE)
}

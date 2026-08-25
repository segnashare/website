/** Clé sessionStorage pour mémoriser la destination post-OAuth website. */
export const WEBSITE_AUTH_NEXT_STORAGE_KEY = 'segna_website_auth_next'

export function storeWebsiteAuthNext(path: string): void {
  const trimmed = path.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return
  try {
    window.sessionStorage.setItem(WEBSITE_AUTH_NEXT_STORAGE_KEY, trimmed)
  } catch {
    // ignore (private mode, etc.)
  }
}

export function readWebsiteAuthNext(): string | null {
  try {
    return window.sessionStorage.getItem(WEBSITE_AUTH_NEXT_STORAGE_KEY)
  } catch {
    return null
  }
}

export function clearWebsiteAuthNext(): void {
  try {
    window.sessionStorage.removeItem(WEBSITE_AUTH_NEXT_STORAGE_KEY)
  } catch {
    // ignore
  }
}

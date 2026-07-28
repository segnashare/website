/**
 * Normalise un href CMS pour éviter les liens relatifs Next.js
 * (ex. `location` depuis `/catalogue/piece/x` → `/catalogue/piece/location`).
 */
export function normalizeHref(href: string | null | undefined, fallback = '#'): string {
  const raw = (href ?? '').trim()
  if (!raw) return fallback

  if (
    raw.startsWith('/') ||
    raw.startsWith('#') ||
    raw.startsWith('?') ||
    raw.startsWith('mailto:') ||
    raw.startsWith('tel:') ||
    /^https?:\/\//i.test(raw) ||
    raw.startsWith('//')
  ) {
    return raw
  }

  return `/${raw}`
}

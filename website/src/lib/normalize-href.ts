import {resolveAppDownloadHref} from '@/lib/catalog/catalog-app-links'

/**
 * Normalise un href CMS pour éviter les liens relatifs Next.js
 * (ex. `location` depuis `/catalogue/piece/x` → `/catalogue/piece/location`).
 */
export function normalizeHref(href: string | null | undefined, fallback = '#'): string {
  const remapped = resolveAppDownloadHref(href)?.trim()
  const raw = remapped || (href ?? '').trim()
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

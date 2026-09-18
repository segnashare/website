import {WEBSITE_LOCATION_PATH, WEBSITE_SUBSCRIPTION_RECAP_PATH} from '@/lib/cart/paths'
import {isAppDownloadCtaLabel, resolveAppDownloadHref} from '@/lib/catalog/catalog-app-links'

/** Normalise les CTA marketing website (`/abonnement` landing → location). */

export function resolveMarketingCtaHref(
  href: string | null | undefined,
  label?: string | null,
): string | null {
  const downloadHref = resolveAppDownloadHref(href, label)
  if (isAppDownloadCtaLabel(label)) return downloadHref
  const h = downloadHref ?? href?.trim()
  if (!h) return null
  if (h === '/abonnement/recap' || h.startsWith('/abonnement/recap?')) return h
  if (h === '/abonnement/succes' || h.startsWith('/abonnement/succes?')) return h
  if (h === '/abonnement' || h.startsWith('/abonnement/') || h.startsWith('/abonnement?')) {
    return WEBSITE_LOCATION_PATH
  }
  return h
}

/** Ancien essai gratuit → offre -50 % premier mois. */
export function resolveMarketingCtaLabel(label: string | null | undefined): string | null {
  const l = label?.trim()
  if (!l) return null
  if (/^1\s*mois\s+d['’]essai\s+gratuit$/i.test(l)) return '-50% sur le premier mois'
  return l
}

/**
 * CTA sous le tryptique : `/signup` → tunnel website ; liens app web → App Store.
 */
export function resolveThreeStepPrimaryCtaHref(
  href: string | null | undefined,
  label?: string | null,
): string | null {
  const mappedLabelHref = resolveMarketingCtaHref(href, label)
  if (!mappedLabelHref) return null
  if (mappedLabelHref === '/signup' || mappedLabelHref.startsWith('/signup?')) {
    return `/signup?next=${encodeURIComponent(WEBSITE_SUBSCRIPTION_RECAP_PATH)}`
  }
  return mappedLabelHref
}

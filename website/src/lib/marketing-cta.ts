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

export const SEGNAX_FULL_PRICE_CTA = 'Essayer SegnaX dès 40€/mois'
const SEGNAX_FULL_PRICE_SUBTITLE =
  '40 €/mois — jusqu’à 400 € de pièces, échanges et assurance inclus.'

function isCancelledFiftyOffCopy(text: string): boolean {
  const hasFifty = /50\s*%/.test(text)
  const hasTwentyFirstMonth = /20\s*€/.test(text) && /1er mois|premier mois/i.test(text)
  return (hasFifty && /premier mois|1er mois/i.test(text)) || hasTwentyFirstMonth
}

/** Ancien essai gratuit / −50 % 1er mois → tarif plein. */
export function resolveMarketingCtaLabel(label: string | null | undefined): string | null {
  const l = label?.trim()
  if (!l) return null
  if (/^1\s*mois\s+d['’]essai\s+gratuit$/i.test(l)) return SEGNAX_FULL_PRICE_CTA
  if (isCancelledFiftyOffCopy(l)) return SEGNAX_FULL_PRICE_CTA
  return l
}

/** Hero / sous-titres Sanity encore rédigés pour l’offre −50 %. */
export function resolveMarketingPromoCopy(text: string | null | undefined): string | null {
  const t = text?.trim()
  if (!t) return null
  if (!isCancelledFiftyOffCopy(t)) return t
  if (t.length <= 64) return SEGNAX_FULL_PRICE_CTA
  return SEGNAX_FULL_PRICE_SUBTITLE
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

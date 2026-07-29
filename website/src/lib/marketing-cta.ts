import {WEBSITE_LOCATION_PATH, WEBSITE_SUBSCRIPTION_RECAP_PATH} from '@/lib/cart/paths'

/** Normalise les CTA marketing website (`/abonnement` landing → location). */

export function resolveMarketingCtaHref(href: string | null | undefined): string | null {
  const h = href?.trim()
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
 * CTA « essai / -50 % » sous le tryptique : plus de deep link app auth,
 * on envoie vers signup (tunnel website).
 */
export function resolveThreeStepPrimaryCtaHref(href: string | null | undefined): string | null {
  const mappedLabelHref = resolveMarketingCtaHref(href)
  if (!mappedLabelHref) return null
  try {
    if (/^https?:\/\//i.test(mappedLabelHref)) {
      const u = new URL(mappedLabelHref)
      if (/(^|\.)segnashare\.com$/i.test(u.hostname) && u.pathname.startsWith('/auth')) {
        return `/signup?next=${encodeURIComponent(WEBSITE_SUBSCRIPTION_RECAP_PATH)}`
      }
    }
  } catch {
    // keep mapped
  }
  if (mappedLabelHref === '/signup' || mappedLabelHref.startsWith('/signup?')) {
    return `/signup?next=${encodeURIComponent(WEBSITE_SUBSCRIPTION_RECAP_PATH)}`
  }
  return mappedLabelHref
}

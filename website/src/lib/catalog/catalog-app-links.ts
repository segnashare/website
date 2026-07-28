/** Liens app Segna (legacy) + landings website (abo / panier). */
export const SEGNA_APP_BASE_URL = (process.env.NEXT_PUBLIC_SEGNA_APP_URL || 'https://app.segnashare.com').replace(
  /\/+$/,
  '',
)

/**
 * URL App Store iOS — à renseigner quand l’app est publiée
 * (ex. `NEXT_PUBLIC_SEGNA_APP_STORE_URL=https://apps.apple.com/app/idXXXXXXXX`).
 * Vide pour l’instant → iOS ouvre directement l’app web.
 */
export const SEGNA_APP_STORE_URL = (process.env.NEXT_PUBLIC_SEGNA_APP_STORE_URL || '').trim()

export function catalogItemPagePath(itemId: string): string {
  return `/catalogue/piece/${itemId}`
}

export function catalogItemAppHref(itemId?: string | null): string {
  if (itemId?.trim()) return `${SEGNA_APP_BASE_URL}/shop?item=${encodeURIComponent(itemId.trim())}`
  return `${SEGNA_APP_BASE_URL}/shop`
}

export function catalogAppSignupHref(): string {
  return `${SEGNA_APP_BASE_URL}/auth/sign-up/email`
}

/** Landing Location (CTAs SegnaX / abo historiques). */
export function catalogSubscriptionHref(): string {
  return '/location'
}

/**
 * iOS : ouvre l’app web (ou universal link).
 * Si `NEXT_PUBLIC_SEGNA_APP_STORE_URL` est défini et que la page reste visible,
 * fallback App Store (réservé pour quand le lien existera).
 */
export function openIosAppOrAppStore(appUrl: string, storeUrl: string = SEGNA_APP_STORE_URL): void {
  if (!storeUrl) {
    window.location.assign(appUrl)
    return
  }

  const startedAt = Date.now()
  let cancelled = false

  const cancel = () => {
    cancelled = true
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', cancel)
  }

  const onVisibility = () => {
    if (document.hidden) cancel()
  }

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', cancel)

  window.location.assign(appUrl)

  window.setTimeout(() => {
    if (cancelled) return
    // App ouverte → onglet en arrière-plan / pagehide. Sinon → App Store.
    if (document.hidden || Date.now() - startedAt > 2800) {
      cancel()
      return
    }
    cancel()
    window.location.assign(storeUrl)
  }, 1400)
}

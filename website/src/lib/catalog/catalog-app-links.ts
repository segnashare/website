/** Liens app Segna (legacy) + landings website (abo / panier). */
export const SEGNA_APP_BASE_URL = (process.env.NEXT_PUBLIC_SEGNA_APP_URL || 'https://app.segnashare.com').replace(
  /\/+$/,
  '',
)

/** Fiche App Store iOS (repli si `NEXT_PUBLIC_SEGNA_APP_STORE_URL` n’est pas défini). */
export const DEFAULT_SEGNA_APP_STORE_URL = 'https://apps.apple.com/fr/app/segna/id6799780391'

/**
 * URL App Store iOS — CTAs « Télécharge l’app » / badges store.
 * Surcharge possible : `NEXT_PUBLIC_SEGNA_APP_STORE_URL`.
 */
export const SEGNA_APP_STORE_URL = (
  process.env.NEXT_PUBLIC_SEGNA_APP_STORE_URL?.trim() || DEFAULT_SEGNA_APP_STORE_URL
).replace(/\/+$/, '')

const APP_DOWNLOAD_LABEL_RE =
  /t[ée]l[ée]charg\w*\s+(l['’]app|l['’]application|segna)|app store|sur l['’]app/i

/** Libellé CMS / bouton dont l’intention est d’ouvrir ou d’installer l’app. */
export function isAppDownloadCtaLabel(label?: string | null): boolean {
  const l = label?.trim() ?? ''
  return l.length > 0 && APP_DOWNLOAD_LABEL_RE.test(l)
}

/** Lien public vers la fiche App Store (frames, badges, CTAs « Télécharge l’app »). */
export function segnaAppDownloadHref(): string {
  return SEGNA_APP_STORE_URL
}

/**
 * Si le libellé (ou le href déjà App Store) vise l’app native, renvoyer la fiche store.
 * Ne touche pas aux CTA signup / club qui pointent encore vers `app.segnashare.com/auth`.
 */
export function resolveAppDownloadHref(
  href: string | null | undefined,
  label?: string | null,
): string | null {
  const h = href?.trim()
  if (isAppDownloadCtaLabel(label)) return SEGNA_APP_STORE_URL
  if (!h) return null
  try {
    const u = new URL(h)
    if (/(^|\.)apps\.apple\.com$/i.test(u.hostname)) return h
  } catch {
    // chemin interne ou URL relative
  }
  return h
}

export function catalogItemPagePath(itemId: string): string {
  return `/catalogue/piece/${itemId}`
}

/** Aligné sur les CSS catalogue (`@media (max-width: 767px)`). */
export const CATALOG_MOBILE_MAX_PX = 767

export function isCatalogMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(`(max-width: ${CATALOG_MOBILE_MAX_PX}px)`).matches
}

/**
 * Desktop : la carte ouvre la modale.
 * Mobile / clic modifié (nouvel onglet) : suivre le lien vers la page pièce.
 */
export function shouldOpenCatalogItemModal(event: {
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}): boolean {
  if (event.button !== 0) return false
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
  return !isCatalogMobileViewport()
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
 * iOS : tente d’ouvrir l’app (universal link / handoff).
 * Si la page reste au premier plan, fallback vers l’App Store.
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

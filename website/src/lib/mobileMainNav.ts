/**
 * Liens du menu mobile plein écran : ordre fixe, toutes les pages principales
 * (le header desktop continue d’utiliser les entrées Sanity).
 */
export type MobileMainNavItem = {
  _key: string
  label: string
  href: string
}

export const MOBILE_MAIN_NAV_ITEMS: MobileMainNavItem[] = [
  {_key: 'accueil', label: 'Accueil', href: '/'},
  {_key: 'comment', label: 'Comment ça marche ?', href: '/comment-ca-marche'},
  {_key: 'combien', label: 'Combien ça coûte ?', href: '/combien-ca-coute'},
  {_key: 'catalogue', label: 'Catalogue', href: '/catalogue'},
  {_key: 'communaute', label: 'Communauté', href: '/communaute'},
  {_key: 'newsroom', label: 'Newsroom', href: '/newsroom'},
  {_key: 'mission', label: 'Mission & Impact', href: '/mission-impact'},
]

function normalizePath(path: string): string {
  if (!path || path === '/') return '/'
  return path.replace(/\/+$/, '')
}

/**
 * Indique si `pathname` correspond à la section du lien (page exacte ou sous-route).
 * La page courante est exclue du menu mobile.
 */
export function isMobileNavSectionActive(pathname: string, href: string): boolean {
  const p = normalizePath(pathname)
  const h = normalizePath(href)
  if (h === '/') return p === '/'
  return p === h || p.startsWith(`${h}/`)
}

export function visibleMobileMainNavItems(pathname: string): MobileMainNavItem[] {
  return MOBILE_MAIN_NAV_ITEMS.filter((item) => !isMobileNavSectionActive(pathname, item.href))
}

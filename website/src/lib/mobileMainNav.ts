/**
 * Liens du menu mobile plein écran : ordre fixe, pages principales
 * (le header desktop continue d’utiliser les entrées Sanity).
 */
export type MobileMainNavItem = {
  _key: string
  label: string
  href: string
}

export const MOBILE_MAIN_NAV_ITEMS: MobileMainNavItem[] = [
  {_key: 'location', label: 'Location', href: '/location'},
  {_key: 'catalogue', label: 'Catalogue', href: '/catalogue'},
  {_key: 'panier', label: 'Panier', href: '/panier'},
  {_key: 'newsroom', label: 'Newsroom', href: '/newsroom'},
  {_key: 'profil', label: 'Profil', href: '/profil'},
]

function hrefPathname(href: string): string {
  const path = href.split('?')[0] ?? href
  if (!path || path === '/') return '/'
  return path.replace(/\/+$/, '')
}

/**
 * Indique si `pathname` correspond à la section du lien (page exacte ou sous-route).
 * La page courante est exclue du menu mobile.
 */
export function isMobileNavSectionActive(pathname: string, href: string): boolean {
  const p = hrefPathname(pathname)
  const h = hrefPathname(href)
  const hasQuery = href.includes('?')
  if (hasQuery) return false
  if (h === '/') return p === '/'
  return p === h || p.startsWith(`${h}/`)
}

export function visibleMobileMainNavItems(pathname: string): MobileMainNavItem[] {
  const items = MOBILE_MAIN_NAV_ITEMS.filter((item) => !isMobileNavSectionActive(pathname, item.href))
  const onHome = hrefPathname(pathname) === '/'
  if (onHome) return items
  return [{_key: 'accueil', label: 'Accueil', href: '/'}, ...items]
}

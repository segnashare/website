import {catalogBrowseNewHref, catalogBrowsePath} from '@/lib/catalog/catalog-browse-href'

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
  {_key: 'location', label: 'Location', href: '/catalogue'},
  {_key: 'vetements', label: 'Vêtements', href: catalogBrowsePath(null, 'vetements')},
  {_key: 'accessoires', label: 'Accessoires', href: catalogBrowsePath(null, 'accessoires')},
  {_key: 'chaussures', label: 'Chaussures', href: catalogBrowsePath(null, 'chaussures')},
  {_key: 'sacs', label: 'Sacs', href: catalogBrowsePath(null, 'sacs')},
  {_key: 'nouveautes', label: 'Nouveautés', href: catalogBrowseNewHref()},
  {_key: 'newsroom', label: 'Newsroom', href: '/newsroom'},
]

function hrefPathname(href: string): string {
  const path = href.split('?')[0] ?? href
  if (!path || path === '/') return '/'
  return path.replace(/\/+$/, '')
}

/**
 * Indique si `pathname` correspond à la section du lien (page exacte ou sous-route).
 * Les liens catalogue avec query (`?segment=…`) restent visibles sur `/catalogue`.
 * La page courante est exclue du menu mobile pour les entrées « section » sans query.
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
  return MOBILE_MAIN_NAV_ITEMS.filter((item) => !isMobileNavSectionActive(pathname, item.href))
}

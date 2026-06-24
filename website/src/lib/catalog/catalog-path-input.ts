import type {CatalogPathInput} from '@/lib/catalog/catalog-page-loader'

/** Dérive l’entrée `loadCatalogBrowseFromPath` depuis un chemin catalogue (`/catalogue`, `/catalogue/nike`, …). */
export function catalogPathInputFromPathname(pathname: string): CatalogPathInput {
  const normalized = pathname.replace(/\/+$/, '') || '/catalogue'
  if (normalized === '/catalogue') return {kind: 'all'}

  const parts = normalized.split('/').filter(Boolean)
  if (parts[0] !== 'catalogue') return {kind: 'all'}
  if (parts.length === 2) return {kind: 'one', segment: parts[1]!}
  if (parts.length >= 3) return {kind: 'pair', brandSlug: parts[1]!, categorySlug: parts[2]!}
  return {kind: 'all'}
}

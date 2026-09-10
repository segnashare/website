import {apparelDisplayLabelForCode} from '@/lib/catalog/apparel-size-referential'

/** Libellé si la pièce a réellement une taille unique (TU), pas un fallback d’absence. */
export const CATALOG_UNIQUE_SIZE_LABEL = 'Taille unique'

export function isUniqueSizeToken(raw: string): boolean {
  const t = raw.trim().toLowerCase()
  if (!t) return false
  if (t === 'tu' || t === 'os' || t === 'onesize' || t === 'one_size' || t === 'one-size') return true
  if (t === 'unique' || t === 'taille unique' || t === 'taille-unique') return true
  const afterColon = t.includes(':') ? t.slice(t.lastIndexOf(':') + 1) : t
  return afterColon === 'tu' || afterColon === 'os' || afterColon === 'unique'
}

function prefixTaille(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  if (/^taille\s+/i.test(t)) return t
  return `Taille ${t}`
}

/**
 * Taille pour cartes catalogue marketing.
 * Absent → ligne omise (chaîne vide). Range key (`XS/S/M`) prioritaire sur le code unitaire.
 */
export function formatCatalogCardSizeLabel(
  sizeLabel: string | null | undefined,
  sizeCode?: string | null | undefined,
): string {
  const label = typeof sizeLabel === 'string' ? sizeLabel.trim() : ''
  const code = typeof sizeCode === 'string' ? sizeCode.trim() : ''
  if (!label && !code) return ''
  if (label) {
    if (isUniqueSizeToken(label)) return CATALOG_UNIQUE_SIZE_LABEL
    return prefixTaille(label)
  }
  if (isUniqueSizeToken(code)) return CATALOG_UNIQUE_SIZE_LABEL
  const fromReferential = apparelDisplayLabelForCode(code, label)
  return prefixTaille(fromReferential || code)
}

/** Libellé affiché quand la pièce n’a pas de taille numérique / lettre (bijoux, etc.). */
export const CATALOG_UNIQUE_SIZE_LABEL = 'Taille Unique'

export function isUniqueSizeToken(raw: string): boolean {
  const t = raw.trim().toLowerCase()
  if (!t) return true
  if (t === 'tu' || t === 'os' || t === 'onesize' || t === 'one_size' || t === 'one-size') return true
  if (t === 'unique' || t === 'taille unique' || t === 'taille-unique') return true
  // Codes type `top:TU`
  const afterColon = t.includes(':') ? t.slice(t.lastIndexOf(':') + 1) : t
  return afterColon === 'tu' || afterColon === 'os' || afterColon === 'unique'
}

/**
 * Taille pour cartes catalogue marketing.
 * Absent / TU / « taille unique » → « Taille Unique » ; sinon label, sinon code.
 */
export function formatCatalogCardSizeLabel(
  sizeLabel: string | null | undefined,
  sizeCode?: string | null | undefined,
): string {
  const label = typeof sizeLabel === 'string' ? sizeLabel.trim() : ''
  const code = typeof sizeCode === 'string' ? sizeCode.trim() : ''
  if (!label && !code) return CATALOG_UNIQUE_SIZE_LABEL
  if (label && isUniqueSizeToken(label)) return CATALOG_UNIQUE_SIZE_LABEL
  if (!label && code && isUniqueSizeToken(code)) return CATALOG_UNIQUE_SIZE_LABEL
  return label || code
}

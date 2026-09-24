/**
 * Chiffres locaux FR sans indicatif (9 chiffres après le 0 national).
 * Retire aussi `+33` / `33` / `0033` pour éviter un affichage du type « 033… »
 * quand le préfixe +33 est déjà à côté du champ.
 */
export function normalizeFrenchLocalNumber(value: string) {
  let digits = value.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('00')) digits = digits.slice(2)
  while (digits.startsWith('33') && digits.length > 9) {
    digits = digits.slice(2)
  }
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits
}

/**
 * E.164 France (`+33` + 9 chiffres). Corrige les doubles indicatifs.
 */
export function normalizeFrenchPhoneToE164(raw: string | null | undefined): string | null {
  if (raw == null) return null
  let d = raw.trim().replace(/\s/g, '')
  if (!d) return null

  if (d.startsWith('+')) d = d.slice(1)
  d = d.replace(/\D/g, '')
  if (!d) return null

  if (d.startsWith('00')) d = d.slice(2)

  if (d.startsWith('33') && d.length === 11 && /^33[67]\d{8}$/.test(d)) {
    return `+${d}`
  }

  if (d.startsWith('33') && d.length > 11) {
    const national = d.replace(/^(33)+/, '')
    if (national.length === 9 && /^[67]\d{8}$/.test(national)) return `+33${national}`
    if (national.startsWith('33') && national.length === 11 && /^33[67]\d{8}$/.test(national)) {
      return `+${national}`
    }
    if (national.startsWith('0') && national.length === 10) return `+33${national.slice(1)}`
  }

  if (d.startsWith('0') && d.length === 10) {
    return `+33${d.slice(1)}`
  }

  if (d.length === 9 && /^[67]\d{8}$/.test(d)) {
    return `+33${d}`
  }

  if (d.startsWith('33') && d.length === 11) {
    return `+${d}`
  }

  return null
}

export function isValidFrenchMobileLocal(value: string): boolean {
  const local = normalizeFrenchLocalNumber(value)
  return local.length === 9 && /^[67]\d{8}$/.test(local)
}

/** Saisie nationale à côté de +33 : « 6 12 34 56 78 » (1er chiffre isolé, puis paires). */
export function formatFrenchNationalGrouped(raw: string): string {
  const digits = normalizeFrenchLocalNumber(raw).slice(0, 9)
  if (!digits) return ''
  const parts = [digits[0]]
  for (let i = 1; i < digits.length; i += 2) {
    parts.push(digits.slice(i, i + 2))
  }
  return parts.join(' ')
}

/** +33781234567 → affichage « +33 6 12 34 56 78 ». */
export function formatFrenchPhoneDisplay(e164: string | null | undefined): string {
  const normalized = normalizeFrenchPhoneToE164(e164)
  if (!normalized) return ''
  const grouped = formatFrenchNationalGrouped(normalized.replace(/^\+33/, ''))
  return grouped ? `+33 ${grouped}` : ''
}

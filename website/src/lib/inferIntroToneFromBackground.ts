/**
 * Luminance relative sRGB (WCAG), entre 0 (noir) et 1 (blanc).
 * Utilisé pour choisir texte clair ou foncé sur un fond couleur CMS.
 */
function relativeLuminance(rLin: number, gLin: number, bLin: number): number {
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin
}

function channelToLinear(c: number): number {
  const cs = c / 255
  return cs <= 0.03928 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4
}

function luminanceFromRgb8(r: number, g: number, b: number): number {
  return relativeLuminance(channelToLinear(r), channelToLinear(g), channelToLinear(b))
}

function parseHexTriplet(hex: string): [number, number, number] | null {
  let h = hex.trim().replace(/^#/u, '')
  if (h.length === 3) {
    h = h
      .split('')
      .map((ch) => ch + ch)
      .join('')
  }
  if (h.length === 6 || h.length === 8) {
    const n = parseInt(h.slice(0, 6), 16)
    if (Number.isNaN(n)) return null
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  return null
}

function parseRgbLike(s: string): [number, number, number] | null {
  const m = s.match(
    /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/iu,
  )
  if (!m) return null
  const r = Math.min(255, Math.max(0, Math.round(Number(m[1]))))
  const g = Math.min(255, Math.max(0, Math.round(Number(m[2]))))
  const b = Math.min(255, Math.max(0, Math.round(Number(m[3]))))
  if ([r, g, b].some((x) => Number.isNaN(x))) return null
  return [r, g, b]
}

/** Seuil : en dessous, le fond est assez sombre pour le jeu de typo « intro sombre » (titres blancs). */
const DARK_BG_LUM_THRESHOLD = 0.42

/**
 * À partir d’une couleur CSS (hex ou rgb/rgba), indique si l’intro doit suivre le thème sombre.
 * Retourne `null` si la valeur n’est pas exploitable (fond par défaut du site, couleur non reconnue).
 */
export function inferIntroToneFromBackground(cssColor: string | undefined): 'light' | 'dark' | null {
  const raw = cssColor?.trim()
  if (!raw) return null

  const lower = raw.toLowerCase()
  if (lower === 'transparent' || lower === 'inherit' || lower === 'initial' || lower === 'unset') {
    return null
  }

  let rgb: [number, number, number] | null = null
  if (raw.startsWith('#')) {
    rgb = parseHexTriplet(raw)
  } else if (raw.startsWith('rgb')) {
    rgb = parseRgbLike(raw.replace(/\s+/gu, ' '))
  }

  if (!rgb) return null
  const lum = luminanceFromRgb8(rgb[0], rgb[1], rgb[2])
  return lum < DARK_BG_LUM_THRESHOLD ? 'dark' : 'light'
}

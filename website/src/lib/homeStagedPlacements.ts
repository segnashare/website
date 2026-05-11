import type {CSSProperties} from 'react'
import type {
  HomeHeroStagedImage,
  HomeHeroStagedLayoutSlot,
  HomeHeroStagedState,
  SanityImageHotspot,
} from '@/lib/sanity'

/** Centre le recadrage `object-fit: cover` sur le point chaud Sanity (si défini). */
export function objectPositionFromHotspot(hotspot?: SanityImageHotspot | null): string | undefined {
  if (hotspot == null || typeof hotspot.x !== 'number' || typeof hotspot.y !== 'number') return undefined
  const x = Math.min(1, Math.max(0, hotspot.x))
  const y = Math.min(1, Math.max(0, hotspot.y))
  return `${x * 100}% ${y * 100}%`
}

type Box = Pick<CSSProperties, 'top' | 'right' | 'bottom' | 'left' | 'width' | 'height' | 'transform'>

/**
 * Positions de repli si l’état n’a pas encore de « Mise en page globale » (plus de raccourcis par image).
 * Ordre = index dans la liste d’images.
 */
const FALLBACK_FRAMES: Box[] = [
  {top: '0', right: '0', left: 'auto', bottom: 'auto', width: '28%', height: '72vh'},
  {top: '10%', left: '3%', right: 'auto', bottom: 'auto', width: '18%', height: '32vh'},
  {top: '36%', right: '4%', left: 'auto', bottom: 'auto', width: '22%', height: '36vh'},
  {top: '14%', left: '50%', right: 'auto', bottom: 'auto', width: '32%', height: '22vh', transform: 'translateX(-50%)'},
  {bottom: '18%', left: '4%', top: 'auto', right: 'auto', width: '24%', height: '44vh'},
]

function meaningfulCss(v?: string | null) {
  return v != null && String(v).trim() !== '' && String(v).trim() !== 'auto'
}

/** Au moins une dimension ou un côté positionné (hors `auto` / vide). */
export function hasCustomLayoutSlot(slot?: HomeHeroStagedLayoutSlot | null): boolean {
  if (!slot || typeof slot !== 'object') return false
  return (
    meaningfulCss(slot.top) ||
    meaningfulCss(slot.right) ||
    meaningfulCss(slot.bottom) ||
    meaningfulCss(slot.left) ||
    meaningfulCss(slot.width) ||
    meaningfulCss(slot.height)
  )
}

function layoutStateFrameToStyle(
  slot: HomeHeroStagedLayoutSlot,
  stackIndex: number,
  aspectRatio?: number,
): CSSProperties {
  const width = slot.width?.trim() || '28%'
  const top = slot.top?.trim() || 'auto'
  const left = slot.left?.trim() || 'auto'
  const right = slot.right?.trim() || 'auto'
  const bottom = slot.bottom?.trim() || 'auto'
  const base: CSSProperties = {
    position: 'absolute',
    top,
    left,
    right,
    bottom,
    width,
    zIndex: typeof slot.zIndex === 'number' ? slot.zIndex : 5 + stackIndex,
  }
  const safeAr = Math.max(0.02, aspectRatio ?? 16 / 9)
  return {
    ...base,
    height: 'auto',
    aspectRatio: safeAr,
  }
}

function pullStateFrameSlot(
  state: HomeHeroStagedState | undefined,
  index: number,
  isNarrow: boolean,
): HomeHeroStagedLayoutSlot | undefined {
  const fl = state?.frameLayout
  if (!fl) return undefined
  if (isNarrow && fl.framesMobile?.length) {
    const m = fl.framesMobile[index]
    if (hasCustomLayoutSlot(m ?? null)) return m
    const d = fl.framesDesktop?.[index]
    if (hasCustomLayoutSlot(d ?? null)) return d
    return undefined
  }
  const d = fl.framesDesktop?.[index]
  return hasCustomLayoutSlot(d ?? null) ? d : undefined
}

function legacySlotStyle(img: HomeHeroStagedImage, stackIndex: number): CSSProperties {
  const w = img.width?.trim()
  const h = img.height?.trim()
  const width = w && w !== 'auto' ? w : '28%'
  const height = h && h !== 'auto' ? h : '40vh'
  return {
    position: 'absolute',
    top: img.top ?? 'auto',
    right: img.right ?? 'auto',
    bottom: img.bottom ?? 'auto',
    left: img.left ?? 'auto',
    width,
    height,
    zIndex: img.zIndex ?? 5 + stackIndex,
  }
}

function fallbackSlotStyle(stackIndex: number): CSSProperties {
  const box = FALLBACK_FRAMES[stackIndex % FALLBACK_FRAMES.length]
  return {
    position: 'absolute',
    ...box,
    zIndex: 5 + stackIndex,
  }
}

/** Ratio largeur/hauteur du fichier (fallback 16:9 si métadonnées absentes). */
function stagedImageAspectRatio(img: HomeHeroStagedImage): number {
  const d = img.image?.asset?.metadata?.dimensions
  if (d?.aspectRatio && d.aspectRatio > 0) return d.aspectRatio
  if (d?.width && d?.height && d.height > 0) return d.width / d.height
  return 16 / 9
}

function legacyHasManualCss(img: HomeHeroStagedImage): boolean {
  return Boolean(
    meaningfulCss(img.top) ||
      meaningfulCss(img.right) ||
      meaningfulCss(img.bottom) ||
      meaningfulCss(img.left) ||
      meaningfulCss(img.width) ||
      meaningfulCss(img.height),
  )
}

/**
 * Style du slot : cadre « mise en page globale » de l’état, sinon champs CSS legacy, sinon positions de repli.
 */
export function resolveStagedImageSlotStyle(
  img: HomeHeroStagedImage,
  stackIndex: number,
  isNarrow = false,
  state?: HomeHeroStagedState,
): CSSProperties {
  const st = pullStateFrameSlot(state, stackIndex, isNarrow)
  if (st) {
    return layoutStateFrameToStyle(st, stackIndex, stagedImageAspectRatio(img))
  }
  if (legacyHasManualCss(img)) {
    return legacySlotStyle(img, stackIndex)
  }
  return fallbackSlotStyle(stackIndex)
}

function normalizedObjectFit(v: unknown): 'cover' | 'contain' | null {
  if (v === 'contain' || v === 'cover') return v
  if (typeof v === 'string') {
    const t = v.trim().toLowerCase()
    if (t === 'contain' || t === 'cover') return t
  }
  return null
}

/**
 * Remplissage : le cadre Sanity peut imposer `objectFit` (sinon chaîne vide = hériter de l’image).
 * Sans cadre, on lit seulement le réglage de l’image (« Contenir » / défaut « Couvrir »).
 */
function resolveImageObjectFit(
  img: HomeHeroStagedImage,
  slot: HomeHeroStagedLayoutSlot | undefined,
): 'cover' | 'contain' {
  const fromSlot = normalizedObjectFit(slot?.objectFit)
  if (fromSlot) return fromSlot
  return normalizedObjectFit(img.objectFit) === 'contain' ? 'contain' : 'cover'
}

/**
 * Dans le cadre défini sur l’état : « Couvrir » = rognage possible (recadrage + hotspot Sanity) ;
 * « Contenir » = image entière. Sans cadre d’état : même logique sur le slot de repli.
 */
export function resolveStagedImageObjectFit(
  img: HomeHeroStagedImage,
  _isNarrow: boolean,
  state?: HomeHeroStagedState,
  stackIndex?: number,
): 'cover' | 'contain' {
  const slot =
    state != null && stackIndex != null ? pullStateFrameSlot(state, stackIndex, _isNarrow) : undefined
  return resolveImageObjectFit(img, slot)
}

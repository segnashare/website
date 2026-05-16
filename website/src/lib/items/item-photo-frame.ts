/**
 * Cadre photo pièce : aligné sur segna-app / segna-backoffice (`ITEM_PHOTO_FRAME_RATIO`).
 */

export type ItemPhotoFrameAspect = 'portrait' | 'square'

export const ITEM_PHOTO_MIN_ZOOM = 0.42
export const ITEM_PHOTO_MAX_ZOOM = 2.5
export const ITEM_PHOTO_MAX_ALIGN_OFFSET_PCT = 50

export type ItemPhotoCoverPosition = {
  offset: {x: number; y: number}
  zoom: number
  aspect: ItemPhotoFrameAspect
}

export function clampItemPhotoZoom(zoom: number): number {
  const n = Number(zoom)
  const basis = Number.isFinite(n) ? n : 1
  return Math.min(ITEM_PHOTO_MAX_ZOOM, Math.max(ITEM_PHOTO_MIN_ZOOM, basis))
}

export function normalizeStoredItemPhotoAspect(raw: unknown): ItemPhotoFrameAspect {
  return raw === 'square' ? 'square' : 'portrait'
}

export function defaultItemPhotoPosition(): ItemPhotoCoverPosition {
  return {offset: {x: 0, y: 0}, zoom: 1, aspect: 'portrait'}
}

function clampItemPhotoAlignOffset(off: {x: number; y: number}): {x: number; y: number} {
  const m = ITEM_PHOTO_MAX_ALIGN_OFFSET_PCT
  return {
    x: Math.min(m, Math.max(-m, off.x)),
    y: Math.min(m, Math.max(-m, off.y)),
  }
}

export function itemPhotoPositionFromParsedJson(parsed: Record<string, unknown>): ItemPhotoCoverPosition {
  const offRaw = parsed.offset
  const off = offRaw && typeof offRaw === 'object' && !Array.isArray(offRaw) ? (offRaw as Record<string, unknown>) : {}
  const x = typeof off.x === 'number' && Number.isFinite(off.x) ? off.x : 0
  const y = typeof off.y === 'number' && Number.isFinite(off.y) ? off.y : 0
  const zoomRaw = typeof parsed.zoom === 'number' && Number.isFinite(parsed.zoom) ? parsed.zoom : 1
  return {
    offset: clampItemPhotoAlignOffset({x, y}),
    zoom: clampItemPhotoZoom(zoomRaw),
    aspect: normalizeStoredItemPhotoAspect(parsed.aspect),
  }
}

export function isDefaultItemPhotoPosition(pos: ItemPhotoCoverPosition): boolean {
  return pos.offset.x === 0 && pos.offset.y === 0 && pos.zoom === 1
}

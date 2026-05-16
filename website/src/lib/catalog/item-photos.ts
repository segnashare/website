/**
 * Parse `items.photos` (JSON) : chemins storage ou URLs, aligné sur l’app Segna.
 */

import {
  defaultItemPhotoPosition,
  itemPhotoPositionFromParsedJson,
  type ItemPhotoCoverPosition,
} from '@/lib/items/item-photo-frame'

export type {ItemPhotoCoverPosition} from '@/lib/items/item-photo-frame'

function photoPositionFromRow(row: Record<string, unknown>): ItemPhotoCoverPosition {
  const pos = row.position
  if (!pos || typeof pos !== 'object' || Array.isArray(pos)) {
    return defaultItemPhotoPosition()
  }
  return itemPhotoPositionFromParsedJson(pos as Record<string, unknown>)
}

function storagePathFromPhotoRow(row: Record<string, unknown>): string | null {
  const storagePathRaw = row.storage_path ?? row.storagePath ?? row.url ?? row.photo_url ?? row.photoUrl
  if (typeof storagePathRaw === 'string' && storagePathRaw.trim()) {
    return storagePathRaw.trim()
  }
  return null
}

export type ItemPhotoSlotMeta = {
  storagePath: string
  position: ItemPhotoCoverPosition
}

/** Première photo + cadrage BO (offset % / zoom). */
export function getFirstPhotoCoverMeta(rawPhotos: unknown): ItemPhotoSlotMeta | null {
  const slots = collectPhotoSlotsFromItemPhotos(rawPhotos)
  return slots[0] ?? null
}

/** Entrées photo triées (`photo1`…) avec chemin et `position`. */
export function collectPhotoSlotsFromItemPhotos(rawPhotos: unknown): ItemPhotoSlotMeta[] {
  const out: ItemPhotoSlotMeta[] = []
  const seen = new Set<string>()

  const push = (row: Record<string, unknown>) => {
    const path = storagePathFromPhotoRow(row)
    if (!path || seen.has(path)) return
    seen.add(path)
    out.push({storagePath: path, position: photoPositionFromRow(row)})
  }

  if (!rawPhotos || typeof rawPhotos !== 'object') return out
  const photos = rawPhotos as Record<string, unknown>

  for (const entry of parsePhotoEntriesFromItemPhotos(rawPhotos)) {
    push(entry)
  }

  const list = photos.entries
  if (Array.isArray(list)) {
    for (const entry of list) {
      if (!entry || typeof entry !== 'object') continue
      push(entry as Record<string, unknown>)
    }
  }

  return out
}

function parsePhotoEntriesFromItemPhotos(raw: unknown): Array<Record<string, unknown>> {
  if (!raw || typeof raw !== 'object') return []
  const photos = raw as Record<string, unknown>
  return Object.entries(photos)
    .filter(([key, value]) => key.toLowerCase().startsWith('photo') && value && typeof value === 'object')
    .sort(([keyA], [keyB]) => {
      const indexA = Number(keyA.toLowerCase().replace('photo', ''))
      const indexB = Number(keyB.toLowerCase().replace('photo', ''))
      if (Number.isNaN(indexA) || Number.isNaN(indexB)) return keyA.localeCompare(keyB)
      return indexA - indexB
    })
    .map(([, value]) => value as Record<string, unknown>)
}

export function getFirstPhotoStoragePath(rawPhotos: unknown): string | null {
  if (!rawPhotos || typeof rawPhotos !== 'object') return null
  const photos = rawPhotos as Record<string, unknown>

  const rootCandidates = [
    photos.main_url,
    photos.mainUrl,
    photos.cover_url,
    photos.coverUrl,
    photos.primary_url,
    photos.primaryUrl,
    photos.url,
  ]
  for (const candidate of rootCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }

  const firstSlot = getFirstPhotoCoverMeta(rawPhotos)
  if (firstSlot) return firstSlot.storagePath

  const entries = parsePhotoEntriesFromItemPhotos(rawPhotos)
  const first = entries[0]
  if (first) {
    const path = storagePathFromPhotoRow(first)
    if (path) return path
  }

  const list = photos.entries
  if (Array.isArray(list)) {
    for (const entry of list) {
      if (!entry || typeof entry !== 'object') continue
      const row = entry as Record<string, unknown>
      const urlCandidate = row.url ?? row.photo_url ?? row.photoUrl ?? row.storage_path ?? row.storagePath
      if (typeof urlCandidate === 'string' && urlCandidate.trim()) {
        return urlCandidate.trim()
      }
    }
  }

  return null
}

/** Chemins ou URLs bruts, dans un ordre stable pour galerie (sans doublons). */
export function collectPhotoPathsFromItemPhotos(rawPhotos: unknown): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const push = (raw: unknown) => {
    if (typeof raw !== 'string') return
    const t = raw.trim()
    if (!t || seen.has(t)) return
    seen.add(t)
    out.push(t)
  }

  if (!rawPhotos || typeof rawPhotos !== 'object') return out
  const photos = rawPhotos as Record<string, unknown>

  for (const c of [
    photos.main_url,
    photos.mainUrl,
    photos.cover_url,
    photos.coverUrl,
    photos.primary_url,
    photos.primaryUrl,
    photos.url,
  ]) {
    push(c)
  }

  for (const entry of parsePhotoEntriesFromItemPhotos(rawPhotos)) {
    push(entry.storage_path ?? entry.storagePath ?? entry.url ?? entry.photo_url ?? entry.photoUrl)
  }

  const list = photos.entries
  if (Array.isArray(list)) {
    for (const entry of list) {
      if (!entry || typeof entry !== 'object') continue
      const row = entry as Record<string, unknown>
      push(row.storage_path ?? row.storagePath ?? row.url ?? row.photo_url ?? row.photoUrl)
    }
  }

  return out
}

/** Première photo `items.photos` (même heuristique que l’app). */
export function getFirstPhotoStoragePath(rawPhotos: unknown): string | null {
  let raw: unknown = rawPhotos
  if (typeof raw === 'string') {
    const t = raw.trim()
    if (!t) return null
    if (/^https?:\/\//i.test(t)) return t
    try {
      raw = JSON.parse(t) as unknown
    } catch {
      return null
    }
  }
  if (!raw) return null
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!entry || typeof entry !== 'object') continue
      const row = entry as Record<string, unknown>
      const urlCandidate =
        row.storage_path ?? row.storagePath ?? row.url ?? row.photo_url ?? row.photoUrl ?? row.path
      if (typeof urlCandidate === 'string' && urlCandidate.trim()) return urlCandidate.trim()
    }
    return null
  }
  if (typeof raw !== 'object') return null
  const photos = raw as Record<string, unknown>
  for (const key of ['main_url', 'mainUrl', 'cover_url', 'coverUrl', 'primary_url', 'primaryUrl', 'url']) {
    const c = photos[key]
    if (typeof c === 'string' && c.trim()) return c.trim()
  }
  const photoEntries = Object.entries(photos)
    .filter(([key, value]) => key.toLowerCase().startsWith('photo') && value && typeof value === 'object')
    .sort(([a], [b]) => {
      const ia = Number(a.toLowerCase().replace('photo', ''))
      const ib = Number(b.toLowerCase().replace('photo', ''))
      if (Number.isNaN(ia) || Number.isNaN(ib)) return a.localeCompare(b)
      return ia - ib
    })
  for (const [, value] of photoEntries) {
    const row = value as Record<string, unknown>
    const path = row.storage_path ?? row.storagePath ?? row.url ?? row.photo_url ?? row.photoUrl
    if (typeof path === 'string' && path.trim()) return path.trim()
  }
  return null
}

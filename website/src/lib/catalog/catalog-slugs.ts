/** Slug URL pour le catalogue (libellés FR, accents retirés). */
export function slugifyFr(raw: string): string {
  const s = raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
  const collapsed = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return collapsed || 'x'
}

export function withUniqueSlugs<T extends {slug: string}>(rows: T[]): T[] {
  const used = new Set<string>()
  return rows.map((row) => {
    let slug = row.slug
    if (!used.has(slug)) {
      used.add(slug)
      return row
    }
    let n = 2
    let next = `${slug}-${n}`
    while (used.has(next)) {
      n += 1
      next = `${slug}-${n}`
    }
    used.add(next)
    return {...row, slug: next}
  })
}

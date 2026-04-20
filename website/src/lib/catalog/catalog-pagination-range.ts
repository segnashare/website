/** Fenêtre de pages type 1 … 7 … 254 avec ellipses. */
export function buildPaginationRange(current: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 0) return []
  if (totalPages <= 9) {
    return Array.from({length: totalPages}, (_, i) => i + 1)
  }
  const pages = new Set<number>()
  pages.add(1)
  pages.add(totalPages)
  for (let p = current - 3; p <= current + 3; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p)
  }
  const sorted = [...pages].sort((a, b) => a - b)
  const out: (number | 'ellipsis')[] = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push('ellipsis')
    out.push(p)
    prev = p
  }
  return out
}

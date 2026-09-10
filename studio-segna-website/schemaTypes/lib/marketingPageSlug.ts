/** Slug URL d’une `marketingPage` (brouillon inclus). */
export function marketingPageSlug(document: unknown): string {
  if (!document || typeof document !== 'object') return ''
  const slug = (document as {slug?: {current?: string}}).slug
  return typeof slug?.current === 'string' ? slug.current.trim() : ''
}

export function isCatalogueMarketingPage(document: unknown): boolean {
  if (!document || typeof document !== 'object') return false
  const id = String((document as {_id?: string})._id ?? '').replace(/^drafts\./, '')
  if (id === 'catalogue') return true
  return marketingPageSlug(document) === 'catalogue'
}

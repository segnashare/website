const SINGLETON_DOCUMENT_TYPES = new Set([
  'websiteSiteSettings',
  'websiteHeaderNav',
  'websiteFooter',
])

/** Types pour lesquels on propose « Dupliquer » avec titre / slug adaptés. */
const CUSTOM_DUPLICATE_SCHEMA_TYPES = new Set([
  'homePage',
  'newsroomPage',
  'marketingPage',
  'post',
])

export function normalizePublishedId(raw: string | undefined): string {
  return (raw ?? '').replace(/^drafts\./, '')
}

export function shouldOfferCustomDuplicate(schemaType: string, publishedId: string): boolean {
  if (!CUSTOM_DUPLICATE_SCHEMA_TYPES.has(schemaType)) return false
  if (SINGLETON_DOCUMENT_TYPES.has(schemaType)) return false
  return true
}

export function shouldStripDefaultDuplicate(schemaType: string, publishedId: string): boolean {
  if (SINGLETON_DOCUMENT_TYPES.has(schemaType)) return true
  if (shouldOfferCustomDuplicate(schemaType, publishedId)) return true
  return false
}

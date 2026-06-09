import type {HomePageDocumentData} from '@/lib/sanity'

export function homeHeroCtaFromPage(
  page: Pick<HomePageDocumentData, 'heroCtaLabel' | 'heroCtaHref' | 'heroCtaPosition'>,
): {label: string; href: string; position: 'left' | 'right'} | null {
  const label = page.heroCtaLabel?.trim()
  const href = page.heroCtaHref?.trim()
  if (!label || !href) return null
  const position = page.heroCtaPosition === 'left' ? 'left' : 'right'
  return {label, href, position}
}

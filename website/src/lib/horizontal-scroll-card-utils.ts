import type {PortableTextBlock} from '@portabletext/types'
import type {HorizontalScrollCard} from '@/lib/sanity'

export function cardHasContent(card: HorizontalScrollCard) {
  const a = card.image?.asset
  return Boolean(a && (a._ref || a.url))
}

export function cardHasBackQuote(card: HorizontalScrollCard) {
  return plainTextFromPortableText(card.backQuote).length > 0
}

export function plainTextFromPortableText(blocks: PortableTextBlock[] | undefined): string {
  if (!Array.isArray(blocks)) return ''
  let out = ''
  for (const block of blocks) {
    if (!block || typeof block !== 'object' || block._type !== 'block') continue
    const children = block.children
    if (!Array.isArray(children)) continue
    for (const span of children) {
      if (span && typeof span === 'object' && 'text' in span && typeof span.text === 'string') {
        out += span.text
      }
    }
    out += ' '
  }
  return out.replace(/\s+/g, ' ').trim()
}

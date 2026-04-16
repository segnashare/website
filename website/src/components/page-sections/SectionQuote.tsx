import type {QuoteSection} from '@/lib/sanity'
import {PortableRichText} from '@/components/cms/PortableRichText'
import styles from './page-sections.module.css'

const SANS_STACK =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

function quoteFontFamily(section: QuoteSection): string {
  const preset = section.typographyPreset ?? 'sans'
  if (preset === 'serif') {
    return 'var(--font-playfair-display), Georgia, "Times New Roman", serif'
  }
  if (preset === 'custom' && section.fontFamilyCustom?.trim()) {
    return section.fontFamilyCustom.trim()
  }
  return SANS_STACK
}

type Props = {
  section: QuoteSection
}

export function SectionQuote({section}: Props) {
  const bg = section.backgroundColor?.trim() || '#ffffff'
  const color = section.textColor?.trim()
  const fontFamily = quoteFontFamily(section)

  if (!section.body?.length) return null

  return (
    <section
      className={styles.quoteSection}
      style={{
        backgroundColor: bg,
        ...(color ? {color} : undefined),
        fontFamily,
      }}
      data-motion={section.motionPreset ?? 'none'}
    >
      <div className={styles.quoteSectionInner}>
        <PortableRichText value={section.body} className={styles.quoteBody} />
      </div>
    </section>
  )
}

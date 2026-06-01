import type {QuoteSection} from '@/lib/sanity'
import {PortableRichText} from '@/components/cms/PortableRichText'
import styles from './page-sections.module.css'

type Props = {
  section: QuoteSection
}

export function SectionQuote({section}: Props) {
  const bg = section.backgroundColor?.trim() || '#ffffff'
  const color = section.textColor?.trim()
  const preset = section.typographyPreset ?? 'serif'
  const customFont =
    preset === 'custom' && section.fontFamilyCustom?.trim() ? section.fontFamilyCustom.trim() : undefined

  if (!section.body?.length) return null

  return (
    <section
      className={[
        styles.quoteSection,
        preset === 'sans' ? styles.quoteSectionSans : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        backgroundColor: bg,
        ...(color ? {color} : undefined),
        ...(customFont ? {fontFamily: customFont} : undefined),
      }}
      data-motion={section.motionPreset ?? 'none'}
    >
      <div className={styles.quoteSectionInner}>
        <PortableRichText value={section.body} className={styles.quoteBody} />
      </div>
    </section>
  )
}

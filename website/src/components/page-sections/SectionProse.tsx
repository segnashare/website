import type {RichTextSection} from '@/lib/sanity'
import {PortableRichText} from '@/components/cms/PortableRichText'
import styles from './page-sections.module.css'

type Props = {
  section: RichTextSection
}

export function SectionProse({section}: Props) {
  return (
    <section
      className={styles.proseSectionBleed}
      data-prose-stack="tight"
      data-motion={section.motionPreset ?? 'none'}
    >
      <div className={styles.proseInner}>
        {section.heading?.trim() ? <h2 className={styles.proseHeading}>{section.heading.trim()}</h2> : null}
        <PortableRichText value={section.body} className={styles.proseBody} />
      </div>
    </section>
  )
}

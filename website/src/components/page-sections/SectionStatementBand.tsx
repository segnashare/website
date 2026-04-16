import type {StatementBandSection} from '@/lib/sanity'
import styles from './page-sections.module.css'

const toneClass: Record<string, string> = {
  default: styles.toneDefault,
  muted: styles.toneMuted,
  contrast: styles.toneContrast,
}

type Props = {
  section: StatementBandSection
}

export function SectionStatementBand({section}: Props) {
  const tone = section.tone && toneClass[section.tone] ? section.tone : 'default'
  const toneCls = toneClass[tone] ?? styles.toneDefault

  return (
    <section
      className={`${styles.statementBand} ${toneCls}`}
      data-motion={section.motionPreset ?? 'none'}
    >
      <div className={styles.statementBandInner}>
        {section.eyebrow?.trim() ? <p className={styles.statementEyebrow}>{section.eyebrow.trim()}</p> : null}
        <h2 className={styles.statementTitle}>{section.title}</h2>
        {section.lead?.trim() ? <p className={styles.statementLead}>{section.lead.trim()}</p> : null}
      </div>
    </section>
  )
}

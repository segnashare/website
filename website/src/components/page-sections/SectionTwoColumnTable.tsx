import type {TwoColumnTableSection} from '@/lib/sanity'
import styles from './page-sections.module.css'

type Props = {
  section: TwoColumnTableSection
}

export function SectionTwoColumnTable({section}: Props) {
  const rows = section.rows?.filter((r) => r.firstCell?.trim() || r.secondCell?.trim()) ?? []
  if (!rows.length) return null

  const h1 = section.firstColumnHeader?.trim() || 'Colonne 1'
  const h2 = section.secondColumnHeader?.trim() || 'Colonne 2'

  return (
    <section className={styles.proseSectionBleed} data-motion={section.motionPreset ?? 'none'}>
      <div className={styles.proseInner}>
        {section.heading?.trim() ? <h2 className={styles.proseHeading}>{section.heading.trim()}</h2> : null}
        {section.intro?.trim() ? (
          <p className={styles.twoColumnTableIntro}>{section.intro.trim()}</p>
        ) : null}
        <div className={styles.twoColumnTableWrap}>
          <table className={styles.twoColumnTable}>
            <thead>
              <tr>
                <th scope="col">{h1}</th>
                <th scope="col">{h2}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._key}>
                  <td>{row.firstCell?.trim() || '—'}</td>
                  <td>{row.secondCell?.trim() || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

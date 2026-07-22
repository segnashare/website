import {SectionIntroCtas} from '@/components/page-sections/SectionIntroCtas'
import type {ComparisonTableSection} from '@/lib/sanity'
import styles from './comparisonTable.module.css'

/** Même asset que `/package` app (`segnaX_logo_blanc.png`). */
const SEGNA_X_LOGO_BLANC_SRC = '/brand/segnaX_logo_blanc.png'

type Props = {
  section: ComparisonTableSection
}

export function SectionComparisonTable({section}: Props) {
  const rows =
    section.rows?.filter(
      (r) => r.label?.trim() || r.guestCell?.trim() || r.memberCell?.trim(),
    ) ?? []
  if (rows.length === 0) return null

  const heading = section.heading?.trim()
  if (!heading) return null

  const highlight = section.highlightMemberColumn !== false
  const headingId = `comparison-table-${section._key}`
  const gridRows = `auto repeat(${rows.length}, auto)`

  return (
    <section
      className={styles.band}
      data-motion={section.motionPreset ?? 'none'}
      aria-labelledby={headingId}
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          <h2 id={headingId} className={styles.heading}>
            {heading}
          </h2>
          {section.intro?.trim() ? <p className={styles.intro}>{section.intro.trim()}</p> : null}
        </header>

        <div
          className={`${styles.grid} ${highlight ? styles.gridHighlight : ''}`.trim()}
          style={{gridTemplateRows: gridRows}}
          role="table"
          aria-label={heading}
        >
          <div className={styles.corner} role="columnheader" style={{gridColumn: 1, gridRow: 1}}>
            <span className={styles.srOnly}>Critère</span>
          </div>
          <div className={styles.colGuest} role="columnheader" style={{gridColumn: 2, gridRow: 1}}>
            Guest
          </div>

          <div
            className={styles.memberCard}
            role="presentation"
            style={{gridColumn: 3, gridRow: `1 / ${rows.length + 2}`}}
          >
            <div className={styles.colMember} role="columnheader">
              {/* eslint-disable-next-line @next/next/no-img-element -- même rendu que package app */}
              <img
                src={SEGNA_X_LOGO_BLANC_SRC}
                alt="SegnaX"
                className={styles.memberLogo}
                width={120}
                height={39}
              />
            </div>
            {rows.map((row) => (
              <div key={`m-${row._key}`} className={styles.cellMember} role="cell">
                <p className={styles.memberText}>{row.memberCell?.trim() || '—'}</p>
              </div>
            ))}
          </div>

          {rows.map((row, index) => {
            const gridRow = index + 2
            const isLast = index === rows.length - 1
            return (
              <div key={row._key} className={styles.rowPair} role="row">
                <div
                  className={`${styles.rowLabel} ${isLast ? styles.rowLast : ''}`.trim()}
                  role="rowheader"
                  style={{gridColumn: 1, gridRow}}
                >
                  {row.label?.trim() || '—'}
                </div>
                <div
                  className={`${styles.cellGuest} ${isLast ? styles.rowLast : ''}`.trim()}
                  role="cell"
                  style={{gridColumn: 2, gridRow}}
                >
                  {row.guestCell?.trim() || '—'}
                </div>
              </div>
            )
          })}
        </div>

        <div className={styles.ctas}>
          <SectionIntroCtas
            primaryCtaLabel={section.primaryCtaLabel}
            primaryCtaHref={section.primaryCtaHref}
            secondaryCtaLabel={section.secondaryCtaLabel}
            secondaryCtaHref={section.secondaryCtaHref}
            size="large"
            nowrap
          />
        </div>
      </div>
    </section>
  )
}

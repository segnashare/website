import styles from './catalogPuzzle.module.css'

type Props = {
  heading?: string
  lead?: string
  /** `dark` = titres / chapô clairs (bandeau scroll sur fond sombre). Défaut : fond clair, texte foncé. */
  introTone?: 'light' | 'dark'
}

/**
 * En-tête titre + chapô pour le puzzle catalogue et le bandeau horizontal.
 * La typo suit les variables H2 / lead du module CSS (pas de réduction JS pour une ligne).
 */
export function CatalogPuzzleIntroFit({heading, lead, introTone = 'light'}: Props) {
  const h = heading?.trim() ?? ''
  const l = lead?.trim() ?? ''

  if (!h && !l) {
    return null
  }

  return (
    <div className={`${styles.sectionIntro}${introTone === 'dark' ? ` ${styles.introOnDark}` : ''}`}>
      {h ? <h2 className={styles.heading}>{h}</h2> : null}
      {l ? <p className={styles.lead}>{l}</p> : null}
    </div>
  )
}

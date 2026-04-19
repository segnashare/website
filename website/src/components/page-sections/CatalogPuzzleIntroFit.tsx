import {CtaHrefLink} from '@/components/home/heroShared'
import styles from './catalogPuzzle.module.css'

/** Évite flèche en doublon avec l’icône du lien, et caractères parasites (copier-coller HTML). */
function normalizeIntroCtaLabel(raw: string): string {
  let s = raw.trim()
  for (let i = 0; i < 6; i++) {
    const before = s
    s = s
      .replace(/[\s\u00a0]+$/u, '')
      .replace(/(?:→|›|»|➜|\u2192|\u203a)\s*$/u, '')
      .replace(/\s*<\s*$/u, '')
      .trim()
    if (s === before) break
  }
  return s
}

function IntroCtaArrow() {
  return (
    <span className={styles.introCtaArrow} aria-hidden>
      →
    </span>
  )
}

type Props = {
  heading?: string
  lead?: string
  introCtaLabel?: string
  introCtaHref?: string
  /** `dark` = titres / chapô clairs (bandeau scroll sur fond sombre). Défaut : fond clair, texte foncé. */
  introTone?: 'light' | 'dark'
}

/**
 * En-tête titre + chapô pour le puzzle catalogue et le bandeau horizontal.
 * La typo suit les variables H2 / lead du module CSS (pas de réduction JS pour une ligne).
 */
export function CatalogPuzzleIntroFit({
  heading,
  lead,
  introCtaLabel,
  introCtaHref,
  introTone = 'light',
}: Props) {
  const h = heading?.trim() ?? ''
  const l = lead?.trim() ?? ''
  const ctaLabel = normalizeIntroCtaLabel(introCtaLabel ?? '')
  const ctaHref = introCtaHref?.trim() ?? ''
  const showCta = Boolean(ctaLabel && ctaHref)
  const showHeadingRow = Boolean(h || showCta)

  if (!h && !l && !showCta) {
    return null
  }

  return (
    <div className={`${styles.sectionIntro}${introTone === 'dark' ? ` ${styles.introOnDark}` : ''}`}>
      {showHeadingRow ? (
        <div className={styles.introHeadingRow}>
          {h ? <h2 className={styles.heading}>{h}</h2> : <div className={styles.introHeadingSpacer} aria-hidden />}
          {showCta ? (
            <CtaHrefLink href={ctaHref} className={styles.introCta}>
              <span className={styles.introCtaLabel}>{ctaLabel}</span>
              <IntroCtaArrow />
            </CtaHrefLink>
          ) : null}
        </div>
      ) : null}
      {l ? <p className={styles.lead}>{l}</p> : null}
    </div>
  )
}

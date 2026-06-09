import {CtaHrefLink} from '@/components/home/heroShared'
import styles from './sectionIntroCtas.module.css'

type CtaPair = {label: string; href: string} | null

function ctaPair(label?: string | null, href?: string | null): CtaPair {
  const l = label?.trim()
  const h = href?.trim()
  return l && h ? {label: l, href: h} : null
}

type Props = {
  primaryCtaLabel?: string | null
  primaryCtaHref?: string | null
  secondaryCtaLabel?: string | null
  secondaryCtaHref?: string | null
  /** `dark` = fond sombre → boutons inversés (blanc plein, contour blanc). */
  tone?: 'light' | 'dark'
}

export function SectionIntroCtas({
  primaryCtaLabel,
  primaryCtaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
  tone = 'light',
}: Props) {
  const primary = ctaPair(primaryCtaLabel, primaryCtaHref)
  const secondary = ctaPair(secondaryCtaLabel, secondaryCtaHref)

  if (!primary && !secondary) return null

  const toneCls = tone === 'dark' ? styles.onDark : styles.onLight

  return (
    <div className={`${styles.row} ${toneCls}`}>
      {primary ? (
        <CtaHrefLink href={primary.href} className={styles.primary}>
          {primary.label}
        </CtaHrefLink>
      ) : null}
      {secondary ? (
        <CtaHrefLink href={secondary.href} className={styles.secondary}>
          {secondary.label}
        </CtaHrefLink>
      ) : null}
    </div>
  )
}

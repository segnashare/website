import {CatalogRingDotSpinner} from '@/components/catalog/CatalogRingDotSpinner'
import styles from './websitePageLoading.module.css'

type Props = {
  label?: string
  /** `main` = page entière ; `div` = zone dans une page déjà montée. */
  as?: 'main' | 'div'
  /** Hauteur réduite (Suspense partiel, bloc dans une page). */
  compact?: boolean
  className?: string
}

/** Écran / zone de chargement — anneau de points (même langage que l’app). */
export function WebsitePageLoading({
  label = 'Chargement',
  as = 'main',
  compact = false,
  className,
}: Props) {
  const Tag = as
  return (
    <Tag
      className={[styles.root, compact ? styles.compact : '', className].filter(Boolean).join(' ')}
      aria-busy
      aria-label={label}
    >
      <CatalogRingDotSpinner aria-label={label} />
    </Tag>
  )
}

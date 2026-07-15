import styles from './catalogCardBadges.module.css'

type Props = {
  isNew?: boolean
  isSold?: boolean
  className?: string
}

/** Badges overlay carte catalogue : « New » (Playfair) / « Sold » (Montserrat). */
export function CatalogCardBadges({isNew, isSold, className}: Props) {
  if (!isNew && !isSold) return null
  return (
    <div className={[styles.badges, className].filter(Boolean).join(' ')} aria-hidden>
      {isNew ? <span className={styles.badgeNew}>New</span> : null}
      {isSold ? <span className={styles.badgeSold}>Sold</span> : null}
    </div>
  )
}

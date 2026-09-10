import styles from './catalogCardBadges.module.css'

type Props = {
  isNew?: boolean
  isSold?: boolean
  isArchive?: boolean
  className?: string
}

/** Badges overlay carte catalogue : Archive / New / Sold. */
export function CatalogCardBadges({isNew, isSold, isArchive, className}: Props) {
  if (!isArchive && !isNew && !isSold) return null
  return (
    <div className={[styles.badges, className].filter(Boolean).join(' ')} aria-hidden>
      {isArchive ? <span className={styles.badgeArchive}>Archive</span> : null}
      {isNew && !isArchive ? <span className={styles.badgeNew}>New</span> : null}
      {isSold ? <span className={styles.badgeSold}>Sold</span> : null}
    </div>
  )
}

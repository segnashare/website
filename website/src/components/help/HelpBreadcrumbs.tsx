import Link from 'next/link'
import styles from './help.module.css'

export type Crumb = {label: string; href?: string}

type HelpBreadcrumbsProps = {
  items: Crumb[]
}

export function HelpBreadcrumbs({items}: HelpBreadcrumbsProps) {
  if (items.length === 0) return null
  return (
    <nav className={styles.breadcrumbs} aria-label="Fil d’Ariane">
      {items.map((c, i) => (
        <span key={`${c.label}-${i}`} style={{display: 'inline-flex', alignItems: 'center', gap: '0.35rem'}}>
          {i > 0 ? <span className={styles.crumbSep}>/</span> : null}
          {c.href ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
        </span>
      ))}
    </nav>
  )
}

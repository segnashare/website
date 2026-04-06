import Link from 'next/link'
import styles from './help.module.css'
import type {HelpCenterSettingsData} from '@/lib/sanity-help'

type HelpHeaderProps = {
  settings: HelpCenterSettingsData | null
  compactSearch?: boolean
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Zm0-2a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Z"
        fill="currentColor"
      />
      <path d="M15.446 15.446 20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function HelpHeader({settings, compactSearch = true}: HelpHeaderProps) {
  const brand = settings?.headerBrandLabel ?? 'Segna'
  const helpLabel = settings?.headerHelpLabel ?? 'Centre d’aide'
  const homeHref = settings?.homeLinkHref ?? '/'
  const placeholder = settings?.searchPlaceholder ?? 'Rechercher'

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href={homeHref} className={styles.brand}>
          <span>{brand}</span>
          <span className={styles.brandHelp}>{helpLabel}</span>
        </Link>
        <form
          className={compactSearch ? styles.searchForm : `${styles.searchForm} ${styles.heroSearch}`}
          action="/aide/recherche"
          method="get"
          role="search"
        >
          <button type="submit" className={styles.searchBtn} aria-label="Lancer la recherche">
            <SearchIcon />
          </button>
          <input
            className={styles.searchInput}
            type="search"
            name="q"
            placeholder={placeholder}
            autoComplete="off"
          />
        </form>
      </div>
    </header>
  )
}

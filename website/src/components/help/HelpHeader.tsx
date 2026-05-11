'use client'

import Link from 'next/link'
import posthog from 'posthog-js'
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
  /** Accueil marketing du site (indépendant du lien « Retour au site » du pied d’aide). */
  const mainSiteHref = '/'
  const placeholder = settings?.searchPlaceholder ?? 'Rechercher'

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.brand}>
          <Link href={mainSiteHref} className={styles.brandMain}>
            {brand}
          </Link>
          <Link href="/aide" className={styles.brandHelp}>
            {helpLabel}
          </Link>
        </div>
        <form
          className={compactSearch ? styles.searchForm : `${styles.searchForm} ${styles.heroSearch}`}
          action="/aide/recherche"
          method="get"
          role="search"
          onSubmit={(e) => {
            const q = ((e.currentTarget as HTMLFormElement).elements.namedItem('q') as HTMLInputElement)?.value?.trim()
            if (q) posthog.capture('help_search_submitted', {query: q})
          }}
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

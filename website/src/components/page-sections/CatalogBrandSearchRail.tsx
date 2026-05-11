'use client'

import Link from 'next/link'
import posthog from 'posthog-js'
import {useMemo, useState} from 'react'
import styles from './websiteCatalogBrowse.module.css'

export type CatalogBrandSearchItem = {
  id: string
  label: string
  href: string
  active: boolean
}

function normalizeForSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

type Props = {
  brands: CatalogBrandSearchItem[]
}

export function CatalogBrandSearchRail({brands}: Props) {
  const [q, setQ] = useState('')
  const needle = normalizeForSearch(q)
  const filtered = useMemo(() => {
    if (!needle) return brands
    return brands.filter((b) => normalizeForSearch(b.label).includes(needle))
  }, [brands, needle])

  return (
    <>
      <label className={styles.railBrandSearchLabel} htmlFor="catalog-brand-search">
        <span className={styles.visuallyHidden}>Rechercher par marque</span>
        <input
          id="catalog-brand-search"
          type="search"
          enterKeyHint="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher par marque"
          className={styles.railBrandSearch}
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <ul className={styles.railList}>
        {filtered.length === 0 ? (
          <li className={styles.railItem}>
            <span className={styles.railMuted}>Aucune marque ne correspond.</span>
          </li>
        ) : (
          filtered.map((b) => (
            <li key={b.id} className={styles.railItem}>
              <Link
                href={b.href}
                className={`${styles.railLink} ${b.active ? styles.railLinkActive : ''}`}
                onClick={() => posthog.capture('catalog_brand_filter_clicked', {brand: b.label, search_query: q || null})}
              >
                {b.label}
              </Link>
            </li>
          ))
        )}
      </ul>
    </>
  )
}

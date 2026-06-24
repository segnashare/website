'use client'

import {useMemo, useState} from 'react'
import styles from './websiteCatalogBrowse.module.css'

export type CatalogBrandSearchItem = {
  id: string
  label: string
  slug: string
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
  disabled?: boolean
  onBrandSelect: (brandSlug: string) => void
}

export function CatalogBrandSearchRail({brands, disabled, onBrandSelect}: Props) {
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
              <button
                type="button"
                className={`${styles.railLink} ${b.active ? styles.railLinkActive : ''}`}
                disabled={disabled}
                onClick={() => onBrandSelect(b.slug)}
              >
                {b.label}
              </button>
            </li>
          ))
        )}
      </ul>
    </>
  )
}

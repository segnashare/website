'use client'

import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {catalogBrowsePath} from '@/lib/catalog/catalog-browse-href'
import type {HomeCatalogSearchNav} from '@/lib/catalog/home-catalog-search-nav'
import styles from './homeCatalogQuickSearch.module.css'

type Props = {
  nav: HomeCatalogSearchNav | null
  /** `staged` = barre sombre sur hero multi-états ; `single` = barre claire sur hero photo. */
  surface?: 'staged' | 'single'
  placeholder?: string
  searchButtonLabel?: string
  inputId?: string
}

const MAX_EACH = 6
const MIN_QUERY_LEN = 2

function fold(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/** Préfixe sur libellé ou slug (ex. « ba » → Ba&sh, pas Burberry). */
function matchesPrefix(label: string, slug: string, queryFolded: string): boolean {
  const lf = fold(label)
  const sf = fold(slug)
  return lf.startsWith(queryFolded) || sf.startsWith(queryFolded)
}

/** Ancien libellé « Parent — Enfant » : sert encore au matching (ex. taper « jeans »). */
function categoryCompositeLabel(
  c: HomeCatalogSearchNav['categories'][number],
  all: HomeCatalogSearchNav['categories'],
): string {
  if (!c.parentId) return c.label
  const p = all.find((x) => x.id === c.parentId)
  return p ? `${p.label} — ${c.label}` : c.label
}

function categoryMatchesQuery(
  c: HomeCatalogSearchNav['categories'][number],
  all: HomeCatalogSearchNav['categories'],
  queryFolded: string,
): boolean {
  if (matchesPrefix(c.label, c.slug, queryFolded)) return true
  const composite = categoryCompositeLabel(c, all)
  if (matchesPrefix(composite, c.slug, queryFolded)) return true
  if (!c.parentId) return false
  const p = all.find((x) => x.id === c.parentId)
  return p ? matchesPrefix(p.label, c.slug, queryFolded) : false
}

function SearchLoupeIcon() {
  return (
    <svg className={styles.bubbleIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-4.2-4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

type Suggestion =
  | {kind: 'brand'; slug: string; label: string; href: string}
  | {kind: 'category'; slug: string; label: string; href: string}

export function HomeCatalogQuickSearch({
  nav,
  surface = 'staged',
  placeholder = 'Marque ou catégorie…',
  searchButtonLabel = 'Rechercher',
  inputId = 'home-catalog-quick-search',
}: Props) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  const suggestions = useMemo(() => {
    if (!nav) return []
    const t = fold(q.trim())
    if (t.length < MIN_QUERY_LEN) return []

    const brandHits: Suggestion[] = nav.brands
      .filter((b) => matchesPrefix(b.label, b.slug, t))
      .slice(0, MAX_EACH)
      .map((b) => ({
        kind: 'brand' as const,
        slug: b.slug,
        label: b.label,
        href: catalogBrowsePath(b.slug, null),
      }))

    const catHits: Suggestion[] = nav.categories
      .filter((c) => categoryMatchesQuery(c, nav.categories, t))
      .slice(0, MAX_EACH)
      .map((c) => ({
        kind: 'category' as const,
        slug: c.slug,
        label: c.label,
        href: catalogBrowsePath(null, c.slug),
      }))

    return [...brandHits, ...catHits]
  }, [nav, q])

  const flatList = useMemo(() => {
    const brands = suggestions.filter((s): s is Extract<Suggestion, {kind: 'brand'}> => s.kind === 'brand')
    const cats = suggestions.filter((s): s is Extract<Suggestion, {kind: 'category'}> => s.kind === 'category')
    return {brands, cats, ordered: [...brands, ...cats]}
  }, [suggestions])

  useEffect(() => {
    setActive(0)
  }, [q, suggestions.length])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const goCatalog = useCallback(() => {
    router.push('/catalogue')
  }, [router])

  const goActive = useCallback(() => {
    const item = flatList.ordered[active]
    if (item) router.push(item.href)
    else goCatalog()
  }, [active, flatList.ordered, goCatalog, router])

  const barClass =
    surface === 'single' ? `${styles.searchBar} ${styles.searchBarLight}` : styles.searchBar

  if (!nav || (nav.brands.length === 0 && nav.categories.length === 0)) {
    return (
      <div className={styles.wrap}>
        <div className={barClass} role="search">
          <input
            id={inputId}
            className={styles.input}
            type="text"
            inputMode="search"
            disabled
            placeholder="Catalogue indisponible"
            aria-label="Recherche catalogue"
          />
          <button type="button" className={styles.button} disabled>
            <SearchLoupeIcon />
            <span className={styles.buttonLabel}>{searchButtonLabel}</span>
          </button>
        </div>
      </div>
    )
  }

  const queryFolded = fold(q.trim())
  const showDropdown = open && queryFolded.length >= MIN_QUERY_LEN && suggestions.length > 0

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div className={barClass} role="search">
        <input
          id={inputId}
          className={styles.input}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setOpen(true)
              setActive((i) => Math.min(i + 1, Math.max(0, flatList.ordered.length - 1)))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              goActive()
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          autoComplete="off"
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? `${inputId}-listbox` : undefined}
          aria-activedescendant={showDropdown && flatList.ordered[active] ? `${inputId}-opt-${active}` : undefined}
        />
        <button type="button" className={styles.button} onClick={goActive} aria-label={searchButtonLabel}>
          <SearchLoupeIcon />
          <span className={styles.buttonLabel}>{searchButtonLabel}</span>
        </button>
      </div>

      {showDropdown ? (
        <div id={`${inputId}-listbox`} className={styles.dropdown} role="listbox">
          {flatList.brands.length > 0 ? (
            <>
              <div className={styles.groupLabel}>Marques</div>
              {flatList.brands.map((s, i) => {
                const idx = flatList.ordered.indexOf(s)
                return (
                  <Link
                    key={`b-${s.slug}`}
                    id={`${inputId}-opt-${idx}`}
                    href={s.href}
                    role="option"
                    className={`${styles.row} ${idx === active ? styles.rowActive : ''}`}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => setOpen(false)}
                  >
                    {s.label}
                    <span className={styles.rowHint}>Marque</span>
                  </Link>
                )
              })}
            </>
          ) : null}
          {flatList.cats.length > 0 ? (
            <>
              <div className={styles.groupLabel}>Catégories</div>
              {flatList.cats.map((s) => {
                const idx = flatList.ordered.indexOf(s)
                return (
                  <Link
                    key={`c-${s.slug}`}
                    id={`${inputId}-opt-${idx}`}
                    href={s.href}
                    role="option"
                    className={`${styles.row} ${idx === active ? styles.rowActive : ''}`}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => setOpen(false)}
                  >
                    {s.label}
                  </Link>
                )
              })}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

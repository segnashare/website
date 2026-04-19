'use client'

import Image from 'next/image'
import Link from 'next/link'
import {useCallback, useEffect, useId, useMemo, useState, type Dispatch, type SetStateAction} from 'react'
import styles from './websiteCatalogBrowse.module.css'

export type WebsiteCatalogBrowseItem = {
  id: string
  title: string
  brand_label: string | null
  category_label: string | null
  color_label: string | null
  size_label: string | null
  price_points: number | null
  item_category_id: string | null
  item_brand_id: string | null
  item_couleur_id: string | null
  item_size_id: string | null
  coverUrl: string | null
  objectPosition?: string
  displayTitle?: string
  displaySubtitle?: string | null
}

type SortMode = 'recent' | 'price_asc' | 'price_desc'

type MobileScreen = 'closed' | 'sort' | 'filters-menu' | 'filters-detail'

type FilterFamily = 'category' | 'brand' | 'color' | 'size'

const SORT_OPTIONS: {id: SortMode; label: string}[] = [
  {id: 'recent', label: 'Nouveautés'},
  {id: 'price_asc', label: 'Prix : croissant'},
  {id: 'price_desc', label: 'Prix : décroissant'},
]

const FILTER_MENU: {family: FilterFamily; label: string}[] = [
  {family: 'category', label: 'Catégories'},
  {family: 'brand', label: 'Marques'},
  {family: 'color', label: 'Couleurs'},
  {family: 'size', label: 'Tailles'},
]

function priceLabel(p: number | null): string {
  if (typeof p === 'number' && !Number.isNaN(p)) return `${p} pts`
  return '—'
}

function uniqOptions(
  items: WebsiteCatalogBrowseItem[],
  key: 'item_category_id' | 'item_brand_id' | 'item_couleur_id' | 'item_size_id',
  labelKey: 'category_label' | 'brand_label' | 'color_label' | 'size_label',
): {id: string; label: string}[] {
  const m = new Map<string, string>()
  for (const it of items) {
    const id = it[key]
    const label = it[labelKey]
    if (id && label?.trim()) m.set(id, label.trim())
  }
  return [...m.entries()]
    .map(([id, label]) => ({id, label}))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
}

function applyFilters(
  items: WebsiteCatalogBrowseItem[],
  categoryId: string | null,
  brandIds: Set<string>,
  colorIds: Set<string>,
  sizeIds: Set<string>,
): WebsiteCatalogBrowseItem[] {
  return items.filter((it) => {
    if (categoryId && it.item_category_id !== categoryId) return false
    if (brandIds.size > 0) {
      if (!it.item_brand_id || !brandIds.has(it.item_brand_id)) return false
    }
    if (colorIds.size > 0) {
      if (!it.item_couleur_id || !colorIds.has(it.item_couleur_id)) return false
    }
    if (sizeIds.size > 0) {
      if (!it.item_size_id || !sizeIds.has(it.item_size_id)) return false
    }
    return true
  })
}

function applySort(list: WebsiteCatalogBrowseItem[], mode: SortMode): WebsiteCatalogBrowseItem[] {
  if (mode === 'recent') return list
  const copy = [...list]
  const rank = (p: number | null) => (typeof p === 'number' && !Number.isNaN(p) ? p : Number.POSITIVE_INFINITY)
  copy.sort((a, b) => {
    const pa = rank(a.price_points)
    const pb = rank(b.price_points)
    return mode === 'price_asc' ? pa - pb : pb - pa
  })
  return copy
}

type Props = {
  items: WebsiteCatalogBrowseItem[]
}

export function WebsiteCatalogBrowse({items}: Props) {
  const uid = useId()
  const [sortMode, setSortMode] = useState<SortMode>('recent')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [brandIds, setBrandIds] = useState<Set<string>>(() => new Set())
  const [colorIds, setColorIds] = useState<Set<string>>(() => new Set())
  const [sizeIds, setSizeIds] = useState<Set<string>>(() => new Set())

  const [mobile, setMobile] = useState<MobileScreen>('closed')
  const [mobileFamily, setMobileFamily] = useState<FilterFamily | null>(null)

  const [draftBrands, setDraftBrands] = useState<Set<string>>(() => new Set())
  const [draftColors, setDraftColors] = useState<Set<string>>(() => new Set())
  const [draftSizes, setDraftSizes] = useState<Set<string>>(() => new Set())
  const [draftCategory, setDraftCategory] = useState<string | null>(null)

  const categories = useMemo(() => uniqOptions(items, 'item_category_id', 'category_label'), [items])
  const brands = useMemo(() => uniqOptions(items, 'item_brand_id', 'brand_label'), [items])
  const colors = useMemo(() => uniqOptions(items, 'item_couleur_id', 'color_label'), [items])
  const sizes = useMemo(() => uniqOptions(items, 'item_size_id', 'size_label'), [items])

  const visible = useMemo(() => {
    const f = applyFilters(items, categoryId, brandIds, colorIds, sizeIds)
    return applySort(f, sortMode)
  }, [items, categoryId, brandIds, colorIds, sizeIds, sortMode])

  const closeMobile = useCallback(() => {
    setMobile('closed')
    setMobileFamily(null)
  }, [])

  useEffect(() => {
    if (mobile === 'closed') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [mobile, closeMobile])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => {
      if (mq.matches) closeMobile()
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [closeMobile])

  const openFilterMenu = () => {
    setDraftCategory(categoryId)
    setDraftBrands(new Set(brandIds))
    setDraftColors(new Set(colorIds))
    setDraftSizes(new Set(sizeIds))
    setMobile('filters-menu')
    setMobileFamily(null)
  }

  const openFilterDetail = (f: FilterFamily) => {
    setMobileFamily(f)
    setMobile('filters-detail')
    setDraftCategory(categoryId)
    setDraftBrands(new Set(brandIds))
    setDraftColors(new Set(colorIds))
    setDraftSizes(new Set(sizeIds))
  }

  const applyDraftFilters = () => {
    setCategoryId(draftCategory)
    setBrandIds(new Set(draftBrands))
    setColorIds(new Set(draftColors))
    setSizeIds(new Set(draftSizes))
    closeMobile()
  }

  const toggleIdInSet = (setter: Dispatch<SetStateAction<Set<string>>>, id: string) => {
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const resetFamilyDraft = (f: FilterFamily) => {
    if (f === 'category') setDraftCategory(null)
    if (f === 'brand') setDraftBrands(new Set())
    if (f === 'color') setDraftColors(new Set())
    if (f === 'size') setDraftSizes(new Set())
  }

  const renderGrid = () => (
    <div className={styles.grid}>
      {visible.map((it) => {
        const titleLine = it.displayTitle ?? it.title
        const brandLine = it.brand_label
        const extraLine = it.displaySubtitle?.trim()
        return (
          <Link key={it.id} href={`/catalogue/piece/${it.id}`} className={styles.card}>
            <div className={styles.cardMedia}>
              {it.coverUrl ? (
                <Image
                  src={it.coverUrl}
                  alt=""
                  fill
                  sizes="(max-width: 1023px) 46vw, (max-width: 1400px) 28vw, 240px"
                  quality={90}
                  className={styles.cardImage}
                  style={{
                    objectFit: 'cover',
                    ...(it.objectPosition ? {objectPosition: it.objectPosition} : {}),
                  }}
                />
              ) : null}
            </div>
            <div className={styles.cardBody}>
              {brandLine ? <span className={styles.cardBrand}>{brandLine}</span> : null}
              {extraLine ? <span className={styles.cardMetaLine}>{extraLine}</span> : null}
              <span className={styles.cardTitle}>{titleLine}</span>
              <span className={styles.cardPrice}>{priceLabel(it.price_points)}</span>
            </div>
          </Link>
        )
      })}
    </div>
  )

  const leftRail = (
    <aside className={styles.rail} aria-label="Filtres catalogue">
      <div className={styles.railBlock}>
        <h3 className={styles.railTitle}>Catégories</h3>
        <ul className={styles.railList}>
          <li className={styles.railItem}>
            <label className={styles.railLabel}>
              <input
                type="radio"
                name={`cat-d-${uid}`}
                checked={categoryId === null}
                onChange={() => setCategoryId(null)}
              />
              <span>Toutes</span>
            </label>
          </li>
          {categories.map((c) => (
            <li key={c.id} className={styles.railItem}>
              <label className={styles.railLabel}>
                <input
                  type="radio"
                  name={`cat-d-${uid}`}
                  checked={categoryId === c.id}
                  onChange={() => setCategoryId(c.id)}
                />
                <span>{c.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.railBlock}>
        <h3 className={styles.railTitle}>Marques</h3>
        <ul className={styles.railList}>
          {brands.map((b) => (
            <li key={b.id} className={styles.railItem}>
              <label className={styles.railLabel}>
                <input
                  type="checkbox"
                  checked={brandIds.has(b.id)}
                  onChange={() => toggleIdInSet(setBrandIds, b.id)}
                />
                <span>{b.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )

  const rightRail = (
    <aside className={styles.rail} aria-label="Tri et filtres">
      <div className={styles.railBlock}>
        <h3 className={styles.railTitle}>Trier</h3>
        <ul className={styles.railList}>
          {SORT_OPTIONS.map((o) => (
            <li key={o.id} className={styles.railItem}>
              <label className={styles.railLabel}>
                <input
                  type="radio"
                  name={`sort-d-${uid}`}
                  checked={sortMode === o.id}
                  onChange={() => setSortMode(o.id)}
                />
                <span>{o.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.railBlock}>
        <h3 className={styles.railTitle}>Couleurs</h3>
        <ul className={styles.railList}>
          {colors.map((c) => (
            <li key={c.id} className={styles.railItem}>
              <label className={styles.railLabel}>
                <input
                  type="checkbox"
                  checked={colorIds.has(c.id)}
                  onChange={() => toggleIdInSet(setColorIds, c.id)}
                />
                <span>{c.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.railBlock}>
        <h3 className={styles.railTitle}>Tailles</h3>
        <ul className={styles.railList}>
          {sizes.map((s) => (
            <li key={s.id} className={styles.railItem}>
              <label className={styles.railLabel}>
                <input
                  type="checkbox"
                  checked={sizeIds.has(s.id)}
                  onChange={() => toggleIdInSet(setSizeIds, s.id)}
                />
                <span>{s.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )

  const renderMobileSheet = () => {
    if (mobile === 'closed') return null
    return (
      <div className={styles.sheetBackdrop} role="presentation" onClick={closeMobile}>
        <div className={styles.sheet} role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
          {mobile === 'sort' ? (
            <>
              <h2 className={styles.sheetTitle}>Trier</h2>
              <div className={styles.chipRow}>
                {SORT_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={`${styles.chip} ${sortMode === o.id ? styles.chipActive : ''}`}
                    onClick={() => setSortMode(o.id)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <button type="button" className={styles.sheetPrimary} onClick={closeMobile}>
                OK
              </button>
            </>
          ) : null}

          {mobile === 'filters-menu' ? (
            <>
              <h2 className={styles.sheetTitle}>Filtrer par…</h2>
              {FILTER_MENU.map((row) => (
                <button key={row.family} type="button" className={styles.menuRow} onClick={() => openFilterDetail(row.family)}>
                  <span>{row.label}</span>
                  <span className={styles.menuRowChev} aria-hidden>
                    ›
                  </span>
                </button>
              ))}
              <button type="button" className={styles.sheetPrimary} onClick={applyDraftFilters}>
                Appliquer
              </button>
              <button type="button" className={styles.sheetGhost} onClick={closeMobile}>
                Fermer
              </button>
            </>
          ) : null}

          {mobile === 'filters-detail' && mobileFamily ? (
            <>
              <button
                type="button"
                className={styles.sheetBack}
                onClick={() => {
                  setMobile('filters-menu')
                  setMobileFamily(null)
                }}
              >
                ← Retour
              </button>
              <h2 className={styles.sheetTitle}>
                {FILTER_MENU.find((x) => x.family === mobileFamily)?.label ?? 'Filtre'}
              </h2>
              {mobileFamily === 'category' ? (
                <ul className={styles.railList}>
                  <li className={styles.railItem}>
                    <label className={styles.railLabel}>
                      <input
                        type="radio"
                        name={`cat-m-${uid}`}
                        checked={draftCategory === null}
                        onChange={() => setDraftCategory(null)}
                      />
                      <span>Toutes</span>
                    </label>
                  </li>
                  {categories.map((c) => (
                    <li key={c.id} className={styles.railItem}>
                      <label className={styles.railLabel}>
                        <input
                          type="radio"
                          name={`cat-m-${uid}`}
                          checked={draftCategory === c.id}
                          onChange={() => setDraftCategory(c.id)}
                        />
                        <span>{c.label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : null}
              {mobileFamily === 'brand'
                ? brands.map((b) => (
                    <label key={b.id} className={styles.railLabel} style={{display: 'flex', marginBottom: '0.5rem'}}>
                      <input
                        type="checkbox"
                        checked={draftBrands.has(b.id)}
                        onChange={() => toggleIdInSet(setDraftBrands, b.id)}
                      />
                      <span>{b.label}</span>
                    </label>
                  ))
                : null}
              {mobileFamily === 'color'
                ? colors.map((c) => (
                    <label key={c.id} className={styles.railLabel} style={{display: 'flex', marginBottom: '0.5rem'}}>
                      <input
                        type="checkbox"
                        checked={draftColors.has(c.id)}
                        onChange={() => toggleIdInSet(setDraftColors, c.id)}
                      />
                      <span>{c.label}</span>
                    </label>
                  ))
                : null}
              {mobileFamily === 'size'
                ? sizes.map((s) => (
                    <label key={s.id} className={styles.railLabel} style={{display: 'flex', marginBottom: '0.5rem'}}>
                      <input
                        type="checkbox"
                        checked={draftSizes.has(s.id)}
                        onChange={() => toggleIdInSet(setDraftSizes, s.id)}
                      />
                      <span>{s.label}</span>
                    </label>
                  ))
                : null}
              <button type="button" className={styles.sheetPrimary} onClick={() => setMobile('filters-menu')}>
                OK
              </button>
              <button type="button" className={styles.sheetGhost} onClick={() => resetFamilyDraft(mobileFamily)}>
                Réinitialiser ce filtre
              </button>
            </>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className={styles.countLine}>
        {visible.length} pièce{visible.length > 1 ? 's' : ''}
        {visible.length !== items.length ? ` sur ${items.length}` : ''}
      </p>

      <div className={styles.layout}>
        {leftRail}
        <div className={styles.center}>{renderGrid()}</div>
        {rightRail}
      </div>

      <div className={styles.mobileBar}>
        <button type="button" className={`${styles.mobileBtn} ${styles.mobileBtnSecondary}`} onClick={() => setMobile('sort')}>
          Trier
        </button>
        <button type="button" className={styles.mobileBtn} onClick={openFilterMenu}>
          Filtrer
        </button>
      </div>

      {renderMobileSheet()}
    </div>
  )
}

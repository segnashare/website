'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import posthog from 'posthog-js'
import {buildPaginationRange} from '@/lib/catalog/catalog-pagination-range'
import type {CatalogSortMode, MarketingCatalogFacets, MarketingCatalogGridItem} from '@/lib/catalog/marketing-catalog-items'
import styles from './websiteCatalogBrowse.module.css'

export type WebsiteCatalogBrowseProps =
  | {
      mode: 'remote'
      facets: MarketingCatalogFacets
      pageSize: number
      initialItems: MarketingCatalogGridItem[]
      initialTotal: number
    }
  | {
      mode: 'local'
      items: MarketingCatalogGridItem[]
    }

type SortMode = CatalogSortMode

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

function uniqOptionsFromItems(
  items: MarketingCatalogGridItem[],
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

function applyLocalFilters(
  items: MarketingCatalogGridItem[],
  categoryId: string | null,
  brandIds: Set<string>,
  colorIds: Set<string>,
  sizeIds: Set<string>,
): MarketingCatalogGridItem[] {
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

function applyLocalSort(list: MarketingCatalogGridItem[], mode: SortMode): MarketingCatalogGridItem[] {
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

function toggleIdInSet(setter: Dispatch<SetStateAction<Set<string>>>, id: string) {
  setter((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
}

function serializeSets(brandIds: Set<string>, colorIds: Set<string>, sizeIds: Set<string>) {
  return {
    brands: [...brandIds].sort().join(','),
    colors: [...colorIds].sort().join(','),
    sizes: [...sizeIds].sort().join(','),
  }
}

function renderProductCard(it: MarketingCatalogGridItem) {
  const titleLine = it.displayTitle ?? it.title
  const brandLine = it.brand_label
  const extraLine = it.displaySubtitle?.trim()
  return (
    <Link key={it.id} href={`/catalogue/piece/${it.id}`} className={styles.card} onClick={() => posthog.capture('catalog_item_clicked', {item_id: it.id, item_title: it.title, brand: it.brand_label, category: it.category_label, price_points: it.price_points})}>
      <div className={styles.cardMedia}>
        {it.coverUrl ? (
          <Image
            src={it.coverUrl}
            alt=""
            fill
            sizes="(max-width: 575px) 45vw, (max-width: 831px) 30vw, (max-width: 1151px) 23vw, 18vw"
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
}

export function WebsiteCatalogBrowse(props: WebsiteCatalogBrowseProps) {
  if (props.mode === 'local') {
    return <WebsiteCatalogBrowseLocal items={props.items} />
  }
  return (
    <WebsiteCatalogBrowseRemote
      facets={props.facets}
      pageSize={props.pageSize}
      initialItems={props.initialItems}
      initialTotal={props.initialTotal}
    />
  )
}

function WebsiteCatalogBrowseLocal({items}: {items: MarketingCatalogGridItem[]}) {
  const uid = useId()
  const pageSize = 50
  const [sortMode, setSortMode] = useState<SortMode>('recent')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [brandIds, setBrandIds] = useState<Set<string>>(() => new Set())
  const [colorIds, setColorIds] = useState<Set<string>>(() => new Set())
  const [sizeIds, setSizeIds] = useState<Set<string>>(() => new Set())
  const [page, setPage] = useState(1)
  const [mobile, setMobile] = useState<MobileScreen>('closed')
  const [mobileFamily, setMobileFamily] = useState<FilterFamily | null>(null)
  const [draftBrands, setDraftBrands] = useState<Set<string>>(() => new Set())
  const [draftColors, setDraftColors] = useState<Set<string>>(() => new Set())
  const [draftSizes, setDraftSizes] = useState<Set<string>>(() => new Set())
  const [draftCategory, setDraftCategory] = useState<string | null>(null)

  const categories = useMemo(() => uniqOptionsFromItems(items, 'item_category_id', 'category_label'), [items])
  const brands = useMemo(() => uniqOptionsFromItems(items, 'item_brand_id', 'brand_label'), [items])
  const colors = useMemo(() => uniqOptionsFromItems(items, 'item_couleur_id', 'color_label'), [items])
  const sizes = useMemo(() => uniqOptionsFromItems(items, 'item_size_id', 'size_label'), [items])

  const filteredSorted = useMemo(() => {
    const f = applyLocalFilters(items, categoryId, brandIds, colorIds, sizeIds)
    return applyLocalSort(f, sortMode)
  }, [items, categoryId, brandIds, colorIds, sizeIds, sortMode])

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageSlice = useMemo(() => {
    const p = Math.min(page, totalPages)
    const start = (p - 1) * pageSize
    return filteredSorted.slice(start, start + pageSize)
  }, [filteredSorted, page, totalPages, pageSize])

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages))
  }, [totalPages])

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
    setDraftCategory(categoryId)
    setDraftBrands(new Set(brandIds))
    setDraftColors(new Set(colorIds))
    setDraftSizes(new Set(sizeIds))
    setMobileFamily(f)
    setMobile('filters-detail')
  }

  const applyDraftFilters = () => {
    setCategoryId(draftCategory)
    setBrandIds(new Set(draftBrands))
    setColorIds(new Set(draftColors))
    setSizeIds(new Set(draftSizes))
    setPage(1)
    closeMobile()
    posthog.capture('catalog_filter_applied', {source: 'mobile_sheet'})
  }

  const resetFamilyDraft = (f: FilterFamily) => {
    if (f === 'category') setDraftCategory(null)
    if (f === 'brand') setDraftBrands(new Set())
    if (f === 'color') setDraftColors(new Set())
    if (f === 'size') setDraftSizes(new Set())
  }

  const railCommon = {
    categories,
    brands,
    colors,
    sizes,
    categoryId,
    setCategoryId,
    brandIds,
    setBrandIds,
    colorIds,
    setColorIds,
    sizeIds,
    setSizeIds,
    sortMode,
    setSortMode,
    uid,
    onFilterChange: () => setPage(1),
    onSortChange: () => setPage(1),
  }

  return (
    <BrowseShell
      countFiltered={filteredSorted.length}
      countTotal={items.length}
      gridItems={pageSlice}
      leftRail={<BrowseLeftRail {...railCommon} />}
      rightRail={<BrowseRightRail {...railCommon} />}
      mobileBar={
        <div className={styles.mobileBar}>
          <button type="button" className={`${styles.mobileBtn} ${styles.mobileBtnSecondary}`} onClick={() => setMobile('sort')}>
            Trier
          </button>
          <button type="button" className={styles.mobileBtn} onClick={openFilterMenu}>
            Filtrer
          </button>
        </div>
      }
      mobileSheet={
        <BrowseMobileSheet
          mobile={mobile}
          mobileFamily={mobileFamily}
          sortMode={sortMode}
          setSortMode={setSortMode}
          onSortCommit={() => setPage(1)}
          closeMobile={closeMobile}
          openFilterDetail={openFilterDetail}
          applyDraftFilters={applyDraftFilters}
          draftCategory={draftCategory}
          setDraftCategory={setDraftCategory}
          categories={categories}
          brands={brands}
          colors={colors}
          sizes={sizes}
          draftBrands={draftBrands}
          setDraftBrands={setDraftBrands}
          draftColors={draftColors}
          setDraftColors={setDraftColors}
          draftSizes={draftSizes}
          setDraftSizes={setDraftSizes}
          setMobile={setMobile}
          setMobileFamily={setMobileFamily}
          resetFamilyDraft={resetFamilyDraft}
          uid={uid}
        />
      }
      pagination={
        totalPages > 1 ? (
          <CatalogPagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setPage}
            busy={false}
          />
        ) : null
      }
    />
  )
}

function WebsiteCatalogBrowseRemote({
  facets,
  pageSize,
  initialItems,
  initialTotal,
}: {
  facets: MarketingCatalogFacets
  pageSize: number
  initialItems: MarketingCatalogGridItem[]
  initialTotal: number
}) {
  const uid = useId()
  const [sortMode, setSortMode] = useState<SortMode>('recent')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [brandIds, setBrandIds] = useState<Set<string>>(() => new Set())
  const [colorIds, setColorIds] = useState<Set<string>>(() => new Set())
  const [sizeIds, setSizeIds] = useState<Set<string>>(() => new Set())
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<MarketingCatalogGridItem[]>(initialItems)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)
  const skipFirstFetch = useRef(true)

  const [mobile, setMobile] = useState<MobileScreen>('closed')
  const [mobileFamily, setMobileFamily] = useState<FilterFamily | null>(null)
  const [draftBrands, setDraftBrands] = useState<Set<string>>(() => new Set())
  const [draftColors, setDraftColors] = useState<Set<string>>(() => new Set())
  const [draftSizes, setDraftSizes] = useState<Set<string>>(() => new Set())
  const [draftCategory, setDraftCategory] = useState<string | null>(null)

  const brandKey = useMemo(() => [...brandIds].sort().join(','), [brandIds])
  const colorKey = useMemo(() => [...colorIds].sort().join(','), [colorIds])
  const sizeKey = useMemo(() => [...sizeIds].sort().join(','), [sizeIds])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sp = new URLSearchParams()
      sp.set('page', String(page))
      sp.set('limit', String(pageSize))
      sp.set('sort', sortMode)
      if (categoryId) sp.set('categoryId', categoryId)
      const {brands, colors, sizes} = serializeSets(brandIds, colorIds, sizeIds)
      if (brands) sp.set('brands', brands)
      if (colors) sp.set('colors', colors)
      if (sizes) sp.set('sizes', sizes)
      const res = await fetch(`/api/marketing/catalog?${sp.toString()}`, {cache: 'no-store'})
      if (!res.ok) throw new Error(String(res.status))
      const data = (await res.json()) as {items?: MarketingCatalogGridItem[]; total?: number}
      setItems(Array.isArray(data.items) ? data.items : [])
      setTotal(typeof data.total === 'number' ? data.total : 0)
    } catch {
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, sortMode, categoryId, brandKey, colorKey, sizeKey])

  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false
      return
    }
    void load()
  }, [load])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, Math.ceil(total / pageSize))))
  }, [total, pageSize])

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
    setDraftCategory(categoryId)
    setDraftBrands(new Set(brandIds))
    setDraftColors(new Set(colorIds))
    setDraftSizes(new Set(sizeIds))
    setMobileFamily(f)
    setMobile('filters-detail')
  }

  const applyDraftFilters = () => {
    setCategoryId(draftCategory)
    setBrandIds(new Set(draftBrands))
    setColorIds(new Set(draftColors))
    setSizeIds(new Set(draftSizes))
    closeMobile()
    posthog.capture('catalog_filter_applied', {source: 'mobile_sheet'})
  }

  const resetFamilyDraft = (f: FilterFamily) => {
    if (f === 'category') setDraftCategory(null)
    if (f === 'brand') setDraftBrands(new Set())
    if (f === 'color') setDraftColors(new Set())
    if (f === 'size') setDraftSizes(new Set())
  }

  const rail = {
    categories: facets.categories,
    brands: facets.brands,
    colors: facets.colors,
    sizes: facets.sizes,
    categoryId,
    setCategoryId,
    brandIds,
    setBrandIds,
    colorIds,
    setColorIds,
    sizeIds,
    setSizeIds,
    sortMode,
    setSortMode,
    uid,
    onFilterChange: () => setPage(1),
    onSortChange: () => setPage(1),
  }

  return (
    <BrowseShell
      countFiltered={total}
      countTotal={total}
      gridItems={items}
      leftRail={<BrowseLeftRail {...rail} />}
      rightRail={<BrowseRightRail {...rail} />}
      mobileBar={
        <div className={styles.mobileBar}>
          <button type="button" className={`${styles.mobileBtn} ${styles.mobileBtnSecondary}`} onClick={() => setMobile('sort')}>
            Trier
          </button>
          <button type="button" className={styles.mobileBtn} onClick={openFilterMenu}>
            Filtrer
          </button>
        </div>
      }
      mobileSheet={
        <BrowseMobileSheet
          mobile={mobile}
          mobileFamily={mobileFamily}
          sortMode={sortMode}
          setSortMode={setSortMode}
          onSortCommit={() => setPage(1)}
          closeMobile={closeMobile}
          openFilterDetail={openFilterDetail}
          applyDraftFilters={applyDraftFilters}
          draftCategory={draftCategory}
          setDraftCategory={setDraftCategory}
          categories={facets.categories}
          brands={facets.brands}
          colors={facets.colors}
          sizes={facets.sizes}
          draftBrands={draftBrands}
          setDraftBrands={setDraftBrands}
          draftColors={draftColors}
          setDraftColors={setDraftColors}
          draftSizes={draftSizes}
          setDraftSizes={setDraftSizes}
          setMobile={setMobile}
          setMobileFamily={setMobileFamily}
          resetFamilyDraft={resetFamilyDraft}
          uid={uid}
        />
      }
      pagination={
        totalPages > 1 ? (
          <CatalogPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} busy={loading} />
        ) : null
      }
      loading={loading}
    />
  )
}

type RailProps = {
  categories: {id: string; label: string}[]
  brands: {id: string; label: string}[]
  colors: {id: string; label: string}[]
  sizes: {id: string; label: string}[]
  categoryId: string | null
  setCategoryId: (v: string | null) => void
  brandIds: Set<string>
  setBrandIds: Dispatch<SetStateAction<Set<string>>>
  colorIds: Set<string>
  setColorIds: Dispatch<SetStateAction<Set<string>>>
  sizeIds: Set<string>
  setSizeIds: Dispatch<SetStateAction<Set<string>>>
  sortMode: SortMode
  setSortMode: (v: SortMode) => void
  uid: string
  onFilterChange: () => void
  onSortChange?: () => void
}

function BrowseLeftRail(p: RailProps) {
  return (
    <aside className={styles.rail} aria-label="Filtres catalogue">
      <div className={styles.railBlock}>
        <h3 className={styles.railTitle}>Catégories</h3>
        <ul className={styles.railList}>
          <li className={styles.railItem}>
            <label className={styles.railLabel}>
              <input
                type="radio"
                name={`cat-d-${p.uid}`}
                checked={p.categoryId === null}
                onChange={() => {
                  p.setCategoryId(null)
                  p.onFilterChange()
                  posthog.capture('catalog_filter_applied', {filter_type: 'category', value: null})
                }}
              />
              <span>Toutes</span>
            </label>
          </li>
          {p.categories.map((c) => (
            <li key={c.id} className={styles.railItem}>
              <label className={styles.railLabel}>
                <input
                  type="radio"
                  name={`cat-d-${p.uid}`}
                  checked={p.categoryId === c.id}
                  onChange={() => {
                    p.setCategoryId(c.id)
                    p.onFilterChange()
                    posthog.capture('catalog_filter_applied', {filter_type: 'category', value: c.label})
                  }}
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
          {p.brands.map((b) => (
            <li key={b.id} className={styles.railItem}>
              <label className={styles.railLabel}>
                <input
                  type="checkbox"
                  checked={p.brandIds.has(b.id)}
                  onChange={() => {
                    toggleIdInSet(p.setBrandIds, b.id)
                    p.onFilterChange()
                    posthog.capture('catalog_filter_applied', {filter_type: 'brand', value: b.label})
                  }}
                />
                <span>{b.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

function BrowseRightRail(p: RailProps) {
  return (
    <aside className={styles.rail} aria-label="Tri et filtres">
      <div className={styles.railBlock}>
        <h3 className={styles.railTitle}>Trier</h3>
        <ul className={styles.railList}>
          {SORT_OPTIONS.map((o) => (
            <li key={o.id} className={styles.railItem}>
              <label className={styles.railLabel}>
                <input
                  type="radio"
                  name={`sort-d-${p.uid}`}
                  checked={p.sortMode === o.id}
                  onChange={() => {
                    p.setSortMode(o.id)
                    p.onSortChange?.()
                    posthog.capture('catalog_sort_changed', {sort_mode: o.id})
                  }}
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
          {p.colors.map((c) => (
            <li key={c.id} className={styles.railItem}>
              <label className={styles.railLabel}>
                <input
                  type="checkbox"
                  checked={p.colorIds.has(c.id)}
                  onChange={() => {
                    toggleIdInSet(p.setColorIds, c.id)
                    p.onFilterChange()
                    posthog.capture('catalog_filter_applied', {filter_type: 'color', value: c.label})
                  }}
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
          {p.sizes.map((s) => (
            <li key={s.id} className={styles.railItem}>
              <label className={styles.railLabel}>
                <input
                  type="checkbox"
                  checked={p.sizeIds.has(s.id)}
                  onChange={() => {
                    toggleIdInSet(p.setSizeIds, s.id)
                    p.onFilterChange()
                    posthog.capture('catalog_filter_applied', {filter_type: 'size', value: s.label})
                  }}
                />
                <span>{s.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

function BrowseMobileSheet(props: {
  mobile: MobileScreen
  mobileFamily: FilterFamily | null
  sortMode: SortMode
  setSortMode: (v: SortMode) => void
  onSortCommit?: () => void
  closeMobile: () => void
  openFilterDetail: (f: FilterFamily) => void
  applyDraftFilters: () => void
  draftCategory: string | null
  setDraftCategory: (v: string | null) => void
  categories: {id: string; label: string}[]
  brands: {id: string; label: string}[]
  colors: {id: string; label: string}[]
  sizes: {id: string; label: string}[]
  draftBrands: Set<string>
  setDraftBrands: Dispatch<SetStateAction<Set<string>>>
  draftColors: Set<string>
  setDraftColors: Dispatch<SetStateAction<Set<string>>>
  draftSizes: Set<string>
  setDraftSizes: Dispatch<SetStateAction<Set<string>>>
  setMobile: (s: MobileScreen) => void
  setMobileFamily: (f: FilterFamily | null) => void
  resetFamilyDraft: (f: FilterFamily) => void
  uid: string
}) {
  const {
    mobile,
    mobileFamily,
    sortMode,
    setSortMode,
    onSortCommit,
    closeMobile,
    openFilterDetail,
    applyDraftFilters,
    draftCategory,
    setDraftCategory,
    categories,
    brands,
    colors,
    sizes,
    draftBrands,
    setDraftBrands,
    draftColors,
    setDraftColors,
    draftSizes,
    setDraftSizes,
    setMobile,
    setMobileFamily,
    resetFamilyDraft,
    uid,
  } = props

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
                  onClick={() => {
                    setSortMode(o.id)
                    onSortCommit?.()
                    posthog.capture('catalog_sort_changed', {sort_mode: o.id, source: 'mobile'})
                  }}
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
            <h2 className={styles.sheetTitle}>{FILTER_MENU.find((x) => x.family === mobileFamily)?.label ?? 'Filtre'}</h2>
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
                    <input type="checkbox" checked={draftBrands.has(b.id)} onChange={() => toggleIdInSet(setDraftBrands, b.id)} />
                    <span>{b.label}</span>
                  </label>
                ))
              : null}
            {mobileFamily === 'color'
              ? colors.map((c) => (
                  <label key={c.id} className={styles.railLabel} style={{display: 'flex', marginBottom: '0.5rem'}}>
                    <input type="checkbox" checked={draftColors.has(c.id)} onChange={() => toggleIdInSet(setDraftColors, c.id)} />
                    <span>{c.label}</span>
                  </label>
                ))
              : null}
            {mobileFamily === 'size'
              ? sizes.map((s) => (
                  <label key={s.id} className={styles.railLabel} style={{display: 'flex', marginBottom: '0.5rem'}}>
                    <input type="checkbox" checked={draftSizes.has(s.id)} onChange={() => toggleIdInSet(setDraftSizes, s.id)} />
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

function BrowseShell({
  countFiltered,
  countTotal,
  gridItems,
  leftRail,
  rightRail,
  mobileBar,
  mobileSheet,
  pagination,
  loading,
}: {
  countFiltered: number
  countTotal: number
  gridItems: MarketingCatalogGridItem[]
  leftRail: ReactNode
  rightRail: ReactNode
  mobileBar: ReactNode
  mobileSheet: ReactNode
  pagination: ReactNode
  loading?: boolean
}) {
  return (
    <div>
      <p className={styles.countLine}>
        {loading ? 'Chargement…' : `${countFiltered} pièce${countFiltered > 1 ? 's' : ''}${countFiltered !== countTotal ? ` sur ${countTotal}` : ''}`}
      </p>
      <div className={styles.layout}>
        {leftRail}
        <div className={styles.center}>
          <div className={styles.grid}>{gridItems.map((it) => renderProductCard(it))}</div>
        </div>
        {rightRail}
      </div>
      {mobileBar}
      {mobileSheet}
      {pagination}
    </div>
  )
}

function CatalogPagination({
  currentPage,
  totalPages,
  onPageChange,
  busy,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (p: number) => void
  busy: boolean
}) {
  const range = useMemo(() => buildPaginationRange(currentPage, totalPages), [currentPage, totalPages])
  return (
    <nav className={styles.pagination} aria-label="Pagination catalogue">
      <button
        type="button"
        className={styles.paginationNav}
        disabled={currentPage <= 1 || busy}
        onClick={() => onPageChange(currentPage - 1)}
      >
        ‹&nbsp;PRÉCÉDENTE
      </button>
      <div className={styles.paginationPages}>
        {range.map((cell, idx) =>
          cell === 'ellipsis' ? (
            <span key={`e-${idx}`} className={styles.paginationEllipsis}>
              …
            </span>
          ) : (
            <button
              key={cell}
              type="button"
              className={`${styles.paginationNum} ${cell === currentPage ? styles.paginationNumActive : ''}`}
              disabled={busy}
              onClick={() => onPageChange(cell)}
            >
              {cell}
            </button>
          ),
        )}
      </div>
      <button
        type="button"
        className={styles.paginationNav}
        disabled={currentPage >= totalPages || busy}
        onClick={() => onPageChange(currentPage + 1)}
      >
        SUIVANTE&nbsp;›
      </button>
    </nav>
  )
}

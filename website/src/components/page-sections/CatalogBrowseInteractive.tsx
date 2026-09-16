'use client'

import {CatalogGridCardMedia} from '@/components/catalog/CatalogGridCardMedia'
import {CatalogItemDetailModal} from '@/components/catalog/CatalogItemDetailModal'
import {prefetchCatalogItemDetailClient} from '@/lib/catalog/catalog-item-detail-client-fetch'
import {fetchCatalogBrowseClient, syncCatalogBrowseUrl} from '@/lib/catalog/catalog-browse-client-fetch'
import {
  catalogBrowseQueriesEqual,
  DEFAULT_CATALOG_BROWSE_QUERY,
} from '@/lib/catalog/catalog-browse-defaults'
import {
  pageHref,
  toggleAvailabilityHref,
  toggleColorHref,
  toggleSizeHref,
  withSort,
} from '@/lib/catalog/catalog-browse-href'
import {CATALOG_AVAILABILITY_OPTIONS} from '@/lib/catalog/catalog-availability'
import {isMarketingCatalogItemAvailable} from '@/lib/catalog/catalog-sold-sort'
import {buildPaginationRange} from '@/lib/catalog/catalog-pagination-range'
import {
  effectiveBrandSlugs,
  effectiveCategorySlugs,
  isCategoryChecked,
  queryWithBrandSlugs,
  queryWithCategorySlugs,
  toggleBrandQuery,
  toggleCategoryQuery,
} from '@/lib/catalog/catalog-category-selection'
import {orderedCategories} from '@/lib/catalog/catalog-category-tree'
import type {CatalogBrowsePayload} from '@/lib/catalog/catalog-page-loader'
import {selectedCollectionLook, type CollectionTargetingLookView} from '@/lib/catalog/catalog-collection-looks'
import {
  applyLookFromTargeting,
  CatalogCollectionTargeting,
} from '@/components/catalog/CatalogCollectionTargeting'
import {resolveCatalogFromQuery} from '@/lib/catalog/catalog-path-resolve'
import {catalogItemPagePath, shouldOpenCatalogItemModal} from '@/lib/catalog/catalog-app-links'
import {formatCatalogPurchasePriceShort} from '@/lib/catalog/catalog-borrow-price-label'
import {formatCatalogCardSizeLabel} from '@/lib/catalog/format-catalog-card-size'
import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import {normalizeCatalogBrowseQuery, parseCatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import {splitMarketingCatalogSizeFacets} from '@/lib/catalog/catalog-size-facet-section'
import type {
  CatalogSortMode,
  MarketingCatalogFacetNavOption,
  MarketingCatalogFacetsNav,
  MarketingCatalogGridItem,
} from '@/lib/catalog/marketing-catalog-items'
import {useSearchParams} from 'next/navigation'
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {createPortal} from 'react-dom'
import styles from './websiteCatalogBrowse.module.css'

function queryFromHref(href: string): CatalogBrowseQuery {
  const u = new URL(href, 'https://local.segna')
  return normalizeCatalogBrowseQuery(parseCatalogBrowseQuery(u.searchParams))
}

/** Signale les navigations Next (menu, liens) sans forcer le CSR de toute la grille. */
function CatalogBrowseRouteSync({onRouteSearch}: {onRouteSearch: () => void}) {
  const searchParams = useSearchParams()
  const key = searchParams.toString()
  useEffect(() => {
    onRouteSearch()
  }, [key, onRouteSearch])
  return null
}

const SORT_OPTIONS: {id: CatalogSortMode; label: string}[] = [
  {id: 'recent', label: 'Nouveautés'},
  {id: 'price_asc', label: 'Prix : croissant'},
  {id: 'price_desc', label: 'Prix : décroissant'},
]

type FilterMenuId = 'sort'

function brandLinkActive(
  brand: MarketingCatalogFacetNavOption,
  query: CatalogBrowseQuery,
  facets: MarketingCatalogFacetsNav,
): boolean {
  return effectiveBrandSlugs(query, facets).includes(brand.slug)
}

function sortLinkActive(query: CatalogBrowseQuery, mode: CatalogSortMode): boolean {
  return query.sort === mode
}

function normalizeForSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

function GridCard({it, onOpen}: {it: MarketingCatalogGridItem; onOpen: (itemId: string) => void}) {
  const titleLine = it.displayTitle ?? it.title
  const sizeLine = formatCatalogCardSizeLabel(it.size_label, it.size_code)
  const available = isMarketingCatalogItemAvailable(it.status)
  return (
    <a
      href={catalogItemPagePath(it.id)}
      className={`${styles.card} ${styles.cardButton}`}
      aria-label={`Voir ${titleLine}`}
      onClick={(e) => {
        if (!shouldOpenCatalogItemModal(e)) return
        e.preventDefault()
        onOpen(it.id)
      }}
      onMouseEnter={() => prefetchCatalogItemDetailClient(it.id)}
      onFocus={() => prefetchCatalogItemDetailClient(it.id)}
    >
      <div className={styles.cardMedia}>
        <CatalogGridCardMedia item={it} />
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>{titleLine}</span>
          <span
            className={`${styles.cardAvailDot} ${available ? styles.cardAvailDotAvailable : styles.cardAvailDotUnavailable}`}
            title={available ? 'Disponible' : 'Indisponible'}
            aria-label={available ? 'Disponible' : 'Indisponible'}
            role="img"
          />
        </div>
        <div className={styles.cardMetaRow}>
          <span className={styles.cardSize}>{sizeLine}</span>
          {it.isSold ? null : (
            <span className={styles.cardPrice}>{formatCatalogPurchasePriceShort(it.price_points)}</span>
          )}
        </div>
      </div>
    </a>
  )
}

function QueryRailButton({
  className,
  children,
  disabled,
  onSelect,
  'aria-label': ariaLabel,
}: {
  className: string
  children: ReactNode
  disabled?: boolean
  onSelect: () => void
  'aria-label'?: string
}) {
  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={() => void onSelect()}
    >
      {children}
    </button>
  )
}

function FilterCheck({checked}: {checked: boolean}) {
  return (
    <span className={`${styles.filterCheck} ${checked ? styles.filterCheckOn : ''}`} aria-hidden>
      {checked ? (
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </span>
  )
}

function FilterCheckOption({
  checked,
  children,
  className,
  disabled,
  onClick,
}: {
  checked: boolean
  children: ReactNode
  className?: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={checked}
      className={`${styles.filterOption} ${checked ? styles.filterOptionChecked : ''} ${className ?? ''}`}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <FilterCheck checked={checked} />
      <span className={styles.filterOptionLabel}>{children}</span>
    </button>
  )
}

function FilterDropdown({
  id,
  label,
  active,
  open,
  onToggle,
  children,
  panelClassName,
  multiselect,
}: {
  id: FilterMenuId
  label: string
  active?: boolean
  open: boolean
  onToggle: (id: FilterMenuId) => void
  children: ReactNode
  panelClassName?: string
  multiselect?: boolean
}) {
  return (
    <div className={styles.filterDropdown}>
      <button
        type="button"
        className={`${styles.catalogToolbarBtn} ${active ? styles.catalogToolbarBtnActive : ''} ${open ? styles.catalogToolbarBtnOpen : ''}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => onToggle(id)}
      >
        <span>{label}</span>
        <svg
          className={`${styles.catalogToolbarChevron} ${open ? styles.catalogToolbarChevronOpen : ''}`}
          viewBox="0 0 24 24"
          width={14}
          height={14}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div
          className={`${styles.filterPanel} ${panelClassName ?? ''}`}
          role="listbox"
          aria-multiselectable={multiselect || undefined}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

function FilterIcon() {
  return (
    <svg className={styles.catalogToolbarIcon} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M7 12h10M10 17h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

const FILTER_SHOW_MORE_LIMIT = 10

type DrawerSectionId = 'category' | 'brands' | 'colors' | 'sizes' | 'availability'

function FilterAccordion({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: DrawerSectionId
  title: string
  open: boolean
  onToggle: (id: DrawerSectionId) => void
  children: ReactNode
}) {
  return (
    <div className={styles.filterAccordion}>
      <button
        type="button"
        className={styles.filterAccordionTrigger}
        aria-expanded={open}
        onClick={() => onToggle(id)}
      >
        <span className={styles.filterAccordionTitle}>{title}</span>
        <svg
          className={`${styles.filterAccordionChevron} ${open ? styles.filterAccordionChevronOpen : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? <div className={styles.filterAccordionPanel}>{children}</div> : null}
    </div>
  )
}

function ShowMoreList({
  items,
  expanded,
  onExpand,
}: {
  items: ReactNode[]
  expanded: boolean
  onExpand: () => void
}) {
  const visible = expanded ? items : items.slice(0, FILTER_SHOW_MORE_LIMIT)
  const hasMore = items.length > FILTER_SHOW_MORE_LIMIT
  return (
    <>
      {visible}
      {hasMore && !expanded ? (
        <button type="button" className={styles.filterShowMore} onClick={onExpand}>
          + Afficher plus
        </button>
      ) : null}
    </>
  )
}

function PaginationControls({
  currentPage,
  totalPages,
  busy,
  onPage,
}: {
  currentPage: number
  totalPages: number
  busy: boolean
  onPage: (page: number) => void
}) {
  const range = buildPaginationRange(currentPage, totalPages)
  return (
    <nav className={styles.pagination} aria-label="Pagination catalogue">
      {currentPage <= 1 ? (
        <span className={styles.paginationNav} style={{opacity: 0.35}} aria-disabled aria-label="Précédente">
          ‹<span className={styles.paginationNavLabel}>&nbsp;PRÉCÉDENTE</span>
        </span>
      ) : (
        <QueryRailButton
          className={styles.paginationNav}
          disabled={busy}
          aria-label="Précédente"
          onSelect={() => onPage(Math.max(1, currentPage - 1))}
        >
          ‹<span className={styles.paginationNavLabel}>&nbsp;PRÉCÉDENTE</span>
        </QueryRailButton>
      )}
      <div className={styles.paginationPages}>
        {range.map((cell, idx) =>
          cell === 'ellipsis' ? (
            <span key={`e-${idx}`} className={styles.paginationEllipsis}>
              …
            </span>
          ) : (
            <QueryRailButton
              key={cell}
              className={`${styles.paginationNum} ${cell === currentPage ? styles.paginationNumActive : ''}`}
              disabled={busy}
              onSelect={() => onPage(cell)}
            >
              {cell}
            </QueryRailButton>
          ),
        )}
      </div>
      {currentPage >= totalPages ? (
        <span className={styles.paginationNav} style={{opacity: 0.35}} aria-disabled aria-label="Suivante">
          <span className={styles.paginationNavLabel}>SUIVANTE&nbsp;</span>›
        </span>
      ) : (
        <QueryRailButton
          className={styles.paginationNav}
          disabled={busy}
          aria-label="Suivante"
          onSelect={() => onPage(Math.min(totalPages, currentPage + 1))}
        >
          <span className={styles.paginationNavLabel}>SUIVANTE&nbsp;</span>›
        </QueryRailButton>
      )}
    </nav>
  )
}

export function CatalogBrowseInteractive({
  payload: initialPayload,
  targetingLooks = [],
}: {
  payload: CatalogBrowsePayload
  targetingLooks?: CollectionTargetingLookView[]
}) {
  const [resolved, setResolved] = useState(initialPayload.resolved)
  const [facets, setFacets] = useState<MarketingCatalogFacetsNav>(initialPayload.facets)
  const [items, setItems] = useState(initialPayload.items)
  const [total, setTotal] = useState(initialPayload.total)
  const [query, setQuery] = useState(() => normalizeCatalogBrowseQuery(initialPayload.query))
  const [loading, setLoading] = useState(false)
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<FilterMenuId | null>(null)
  const [brandSearch, setBrandSearch] = useState('')
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [draftQuery, setDraftQuery] = useState<CatalogBrowseQuery>(() =>
    normalizeCatalogBrowseQuery(initialPayload.query),
  )
  const [draftTotal, setDraftTotal] = useState(initialPayload.total)
  const [drawerSections, setDrawerSections] = useState<Set<DrawerSectionId>>(new Set())
  const [showMoreKeys, setShowMoreKeys] = useState<Record<string, boolean>>({})
  const [portalReady, setPortalReady] = useState(false)
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const fetchGenRef = useRef(0)
  const queryRef = useRef(query)
  queryRef.current = query
  const targetingLooksRef = useRef(targetingLooks)
  targetingLooksRef.current = targetingLooks
  /** Facettes complètes pour résoudre marque/catégorie côté client (évite les facettes scopées). */
  const resolveFacetsRef = useRef(initialPayload.facets)

  const applyQuery = useCallback(async (rawQuery: CatalogBrowseQuery) => {
    let nextQuery = normalizeCatalogBrowseQuery(rawQuery)
    const matchedLook = selectedCollectionLook(targetingLooksRef.current, nextQuery)
    const matchedSlug = matchedLook?.slug ?? null
    if ((nextQuery.lookSlug ?? null) !== matchedSlug) {
      nextQuery = {...nextQuery, lookSlug: matchedSlug}
    }
    const optimisticResolved =
      resolveCatalogFromQuery(resolveFacetsRef.current, nextQuery) ?? ({kind: 'all'} as const)
    const gen = ++fetchGenRef.current
    // UI immédiate : checks / URL / resolved — la grille reste affichée, légèrement atténuée.
    setLoading(true)
    setQuery(nextQuery)
    queryRef.current = nextQuery
    setResolved(optimisticResolved)
    syncCatalogBrowseUrl(nextQuery)
    try {
      const data = await fetchCatalogBrowseClient(nextQuery)
      if (gen !== fetchGenRef.current) return
      if (data.facets) {
        setFacets(data.facets)
        const prev = resolveFacetsRef.current
        resolveFacetsRef.current = {
          categories:
            data.facets.categories.length >= prev.categories.length ? data.facets.categories : prev.categories,
          brands: data.facets.brands.length >= prev.brands.length ? data.facets.brands : prev.brands,
          colors: data.facets.colors.length >= prev.colors.length ? data.facets.colors : prev.colors,
          sizes: data.facets.sizes.length >= prev.sizes.length ? data.facets.sizes : prev.sizes,
        }
      }
      setItems(data.items)
      setTotal(data.total)
      const settled = normalizeCatalogBrowseQuery({
        ...data.query,
        categorySlugs: nextQuery.categorySlugs,
        brandSlugs: nextQuery.brandSlugs,
        colorSlugs: nextQuery.colorSlugs,
        sizeSlugs: nextQuery.sizeSlugs,
        availabilitySlugs: nextQuery.availabilitySlugs,
        materialSlugs: nextQuery.materialSlugs,
        tagSlugs: nextQuery.tagSlugs,
        tagSlug: nextQuery.tagSlug,
        newOnly: nextQuery.newOnly,
        archiveOnly: nextQuery.archiveOnly,
        lookSlug: nextQuery.lookSlug,
      })
      setQuery(settled)
      queryRef.current = settled
      if (data.resolved) setResolved(data.resolved)
      syncCatalogBrowseUrl(settled)
    } catch {
      // Garde l’état optimiste + ancienne grille.
    } finally {
      if (gen === fetchGenRef.current) setLoading(false)
    }
  }, [])

  const syncFromBrowserUrl = useCallback(() => {
    const urlQuery = normalizeCatalogBrowseQuery(
      parseCatalogBrowseQuery(new URLSearchParams(window.location.search)),
    )
    if (catalogBrowseQueriesEqual(urlQuery, queryRef.current)) return
    void applyQuery(urlQuery)
  }, [applyQuery])

  // Premier paint : SSR envoie toujours la query par défaut — rattrapage depuis l’URL réelle.
  useEffect(() => {
    syncFromBrowserUrl()
  }, [syncFromBrowserUrl])

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!openMenu) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (!toolbarRef.current?.contains(target)) setOpenMenu(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [openMenu])

  useEffect(() => {
    if (!filterDrawerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFilterDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [filterDrawerOpen])

  const navigateQuery = useCallback(
    (href: string) => {
      const u = new URL(href, window.location.origin)
      const nextQuery = normalizeCatalogBrowseQuery(parseCatalogBrowseQuery(u.searchParams))
      void applyQuery(nextQuery)
    },
    [applyQuery],
  )

  const toggleMenu = useCallback((id: FilterMenuId) => {
    setOpenMenu((prev) => (prev === id ? null : id))
  }, [])

  const openFilterDrawer = useCallback(() => {
    const q = normalizeCatalogBrowseQuery(queryRef.current)
    setDraftQuery(q)
    setDraftTotal(total)
    setBrandSearch('')
    setShowMoreKeys({})
    const next = new Set<DrawerSectionId>()
    const brandLike = effectiveBrandSlugs(q, facets).length > 0
    if (effectiveCategorySlugs(q, facets).length > 0 || q.subSlug || (q.segmentSlug && !brandLike)) {
      next.add('category')
    }
    if (brandLike) next.add('brands')
    if (q.colorSlugs.length > 0) next.add('colors')
    if (q.sizeSlugs.length > 0) next.add('sizes')
    if (q.availabilitySlugs.length > 0) next.add('availability')
    if (next.size === 0) next.add('category')
    setDrawerSections(next)
    setOpenMenu(null)
    setFilterDrawerOpen(true)
  }, [facets, total])

  useEffect(() => {
    if (!filterDrawerOpen) return
    if (catalogBrowseQueriesEqual({...draftQuery, page: 1}, {...query, page: 1})) {
      setDraftTotal(total)
      return
    }
    let cancelled = false
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const data = await fetchCatalogBrowseClient({...draftQuery, page: 1})
          if (!cancelled) setDraftTotal(data.total)
        } catch {
          /* garde le dernier décompte connu */
        }
      })()
    }, 280)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [draftQuery, filterDrawerOpen, query, total])

  const toggleDrawerSection = useCallback((id: DrawerSectionId) => {
    setDrawerSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const expandShowMore = useCallback((key: string) => {
    setShowMoreKeys((prev) => ({...prev, [key]: true}))
  }, [])

  const applyFilterDrawer = useCallback(() => {
    void applyQuery({...draftQuery, page: 1})
    setFilterDrawerOpen(false)
  }, [applyQuery, draftQuery])

  const resetFilterDrawer = useCallback(() => {
    const cleared: CatalogBrowseQuery = {
      ...DEFAULT_CATALOG_BROWSE_QUERY,
      sort: queryRef.current.sort,
    }
    setDraftQuery(cleared)
    void applyQuery(cleared)
    setFilterDrawerOpen(false)
  }, [applyQuery])

  const patchDraftFromHref = useCallback((href: string) => {
    setDraftQuery(queryFromHref(href))
  }, [])

  const {shoeSizes, apparelSizes} = splitMarketingCatalogSizeFacets(facets.sizes)
  const pageSize = 30
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(query.page, totalPages)

  const brandActive = effectiveBrandSlugs(query, facets).length > 0
  const categoryActive = effectiveCategorySlugs(query, facets).length > 0
  const colorsActive = query.colorSlugs.length > 0
  const sizesActive = query.sizeSlugs.length > 0
  const availabilityActive = query.availabilitySlugs.length > 0
  const sortActive = query.sort !== 'recent'
  const filtersActive =
    categoryActive ||
    brandActive ||
    colorsActive ||
    sizesActive ||
    availabilityActive ||
    query.newOnly ||
    query.archiveOnly ||
    (query.materialSlugs?.length ?? 0) > 0 ||
    (query.tagSlugs?.length ?? 0) > 0 ||
    Boolean(query.tagSlug)

  const draftBrandActive = effectiveBrandSlugs(draftQuery, facets).length > 0
  const draftCategoryActive = effectiveCategorySlugs(draftQuery, facets).length > 0

  const filteredBrands = useMemo(() => {
    const needle = normalizeForSearch(brandSearch)
    if (!needle) return facets.brands
    return facets.brands.filter((b) => normalizeForSearch(b.label).includes(needle))
  }, [brandSearch, facets.brands])

  const itemCountLabel = loading
    ? '…'
    : `${total.toLocaleString('fr-FR')} pièce${total === 1 ? '' : 's'}`

  const filterDrawer =
    portalReady && filterDrawerOpen
      ? createPortal(
          <div className={styles.filterDrawerRoot}>
            <button
              type="button"
              className={styles.filterDrawerBackdrop}
              aria-label="Fermer les filtres"
              onClick={() => setFilterDrawerOpen(false)}
            />
            <aside
              className={styles.filterDrawerPanel}
              role="dialog"
              aria-modal="true"
              aria-labelledby="catalog-filter-drawer-title"
            >
              <header className={styles.filterDrawerHeader}>
                <h2 id="catalog-filter-drawer-title" className={styles.filterDrawerTitle}>
                  Filtres
                </h2>
                <button
                  type="button"
                  className={styles.filterDrawerClose}
                  aria-label="Fermer"
                  onClick={() => setFilterDrawerOpen(false)}
                >
                  <CloseIcon />
                </button>
              </header>
              <div className={styles.filterDrawerBody}>
                <FilterAccordion
                  id="category"
                  title="Catégorie"
                  open={drawerSections.has('category')}
                  onToggle={toggleDrawerSection}
                >
                  <FilterCheckOption
                    key="all-cats"
                    checked={!draftCategoryActive}
                    className={styles.filterOptionParent}
                    onClick={() => setDraftQuery(queryWithCategorySlugs(draftQuery, facets, []))}
                  >
                    Voir tout
                  </FilterCheckOption>
                  {orderedCategories(facets.categories).map((cat) => (
                    <FilterCheckOption
                      key={cat.id}
                      checked={isCategoryChecked(cat, draftQuery, facets)}
                      className={styles.filterOptionParent}
                      onClick={() =>
                        setDraftQuery(toggleCategoryQuery(draftQuery, cat, facets))
                      }
                    >
                      {cat.label}
                    </FilterCheckOption>
                  ))}
                </FilterAccordion>

                <FilterAccordion
                  id="brands"
                  title="Marques"
                  open={drawerSections.has('brands')}
                  onToggle={toggleDrawerSection}
                >
                  <div className={styles.filterSearchWrap}>
                    <input
                      type="search"
                      value={brandSearch}
                      onChange={(e) => setBrandSearch(e.target.value)}
                      placeholder="Rechercher une marque"
                      className={styles.filterSearch}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <FilterCheckOption
                    checked={!draftBrandActive}
                    onClick={() => setDraftQuery(queryWithBrandSlugs(draftQuery, facets, []))}
                  >
                    Toutes les marques
                  </FilterCheckOption>
                  {filteredBrands.length === 0 ? (
                    <p className={styles.filterEmpty}>Aucune marque ne correspond.</p>
                  ) : (
                    <ShowMoreList
                      expanded={Boolean(showMoreKeys.brands) || Boolean(brandSearch.trim())}
                      onExpand={() => expandShowMore('brands')}
                      items={filteredBrands.map((b) => (
                        <FilterCheckOption
                          key={b.id}
                          checked={brandLinkActive(b, draftQuery, facets)}
                          onClick={() => setDraftQuery(toggleBrandQuery(draftQuery, b.slug, facets))}
                        >
                          {b.label}
                        </FilterCheckOption>
                      ))}
                    />
                  )}
                </FilterAccordion>

                <FilterAccordion
                  id="colors"
                  title="Couleur"
                  open={drawerSections.has('colors')}
                  onToggle={toggleDrawerSection}
                >
                  <ShowMoreList
                    expanded={Boolean(showMoreKeys.colors)}
                    onExpand={() => expandShowMore('colors')}
                    items={facets.colors.map((c) => (
                      <FilterCheckOption
                        key={c.id}
                        checked={draftQuery.colorSlugs.includes(c.slug)}
                        onClick={() =>
                          patchDraftFromHref(toggleColorHref({...draftQuery, page: 1}, c.slug))
                        }
                      >
                        {c.label}
                      </FilterCheckOption>
                    ))}
                  />
                </FilterAccordion>

                <FilterAccordion
                  id="sizes"
                  title="Taille"
                  open={drawerSections.has('sizes')}
                  onToggle={toggleDrawerSection}
                >
                  {shoeSizes.length > 0 ? (
                    <>
                      <p className={styles.filterSectionLabel}>Pointures</p>
                      <ShowMoreList
                        expanded={Boolean(showMoreKeys.shoeSizes)}
                        onExpand={() => expandShowMore('shoeSizes')}
                        items={shoeSizes.map((s) => (
                          <FilterCheckOption
                            key={s.id}
                            checked={draftQuery.sizeSlugs.includes(s.slug)}
                            onClick={() =>
                              patchDraftFromHref(toggleSizeHref({...draftQuery, page: 1}, s.slug))
                            }
                          >
                            {s.label}
                          </FilterCheckOption>
                        ))}
                      />
                    </>
                  ) : null}
                  {apparelSizes.length > 0 ? (
                    <>
                      <p className={styles.filterSectionLabel}>Vêtements</p>
                      <ShowMoreList
                        expanded={Boolean(showMoreKeys.apparelSizes)}
                        onExpand={() => expandShowMore('apparelSizes')}
                        items={apparelSizes.map((s) => (
                          <FilterCheckOption
                            key={s.id}
                            checked={draftQuery.sizeSlugs.includes(s.slug)}
                            onClick={() =>
                              patchDraftFromHref(toggleSizeHref({...draftQuery, page: 1}, s.slug))
                            }
                          >
                            {s.label}
                          </FilterCheckOption>
                        ))}
                      />
                    </>
                  ) : null}
                  {shoeSizes.length === 0 && apparelSizes.length === 0 ? (
                    <p className={styles.filterEmpty}>Aucune taille disponible.</p>
                  ) : null}
                </FilterAccordion>

                <FilterAccordion
                  id="availability"
                  title="Disponibilité"
                  open={drawerSections.has('availability')}
                  onToggle={toggleDrawerSection}
                >
                  {CATALOG_AVAILABILITY_OPTIONS.map((o) => (
                    <FilterCheckOption
                      key={o.id}
                      checked={draftQuery.availabilitySlugs.includes(o.id)}
                      onClick={() =>
                        patchDraftFromHref(toggleAvailabilityHref({...draftQuery, page: 1}, o.id))
                      }
                    >
                      {o.label}
                    </FilterCheckOption>
                  ))}
                </FilterAccordion>
              </div>
              <footer className={styles.filterDrawerFooter}>
                <button type="button" className={styles.filterDrawerApply} onClick={applyFilterDrawer}>
                  Voir {draftTotal.toLocaleString('fr-FR')} pièce{draftTotal === 1 ? '' : 's'}
                </button>
                <button type="button" className={styles.filterDrawerReset} onClick={resetFilterDrawer}>
                  Réinitialiser
                </button>
              </footer>
            </aside>
          </div>,
          document.body,
        )
      : null

  return (
    <div className={styles.catalogPageRoot} aria-busy={loading || undefined}>
      <Suspense fallback={null}>
        <CatalogBrowseRouteSync onRouteSearch={syncFromBrowserUrl} />
      </Suspense>

      <CatalogCollectionTargeting
        looks={targetingLooks}
        query={query}
        onSelectLook={(look) => void applyQuery(applyLookFromTargeting(look, queryRef.current))}
      />

      <div className={styles.catalogToolbar} ref={toolbarRef}>
        <span
          className={`${styles.filterCount} ${loading ? styles.filterCountPending : ''}`}
          aria-live="polite"
          aria-busy={loading || undefined}
        >
          {itemCountLabel}
        </span>
        <div className={styles.catalogToolbarActions}>
          <button
            type="button"
            className={`${styles.catalogToolbarBtn} ${filtersActive ? styles.catalogToolbarBtnActive : ''}`}
            onClick={openFilterDrawer}
          >
            <FilterIcon />
            Filtres
          </button>
          <FilterDropdown
            id="sort"
            label="Trier par"
            active={sortActive}
            open={openMenu === 'sort'}
            onToggle={toggleMenu}
            panelClassName={styles.filterPanelAlignEnd}
          >
            {SORT_OPTIONS.map((o) => (
              <FilterCheckOption
                key={o.id}
                checked={sortLinkActive(query, o.id)}
                onClick={() => {
                  navigateQuery(withSort({...query, page: 1}, o.id))
                  setOpenMenu(null)
                }}
              >
                {o.label}
              </FilterCheckOption>
            ))}
          </FilterDropdown>
        </div>
      </div>

      <div className={styles.browseMain}>
        <div
          className={`${styles.grid} ${styles.browseGridSoft} ${loading ? styles.browseGridPending : ''}`}
        >
          {items.map((it) => (
            <GridCard key={it.id} it={it} onOpen={setOpenItemId} />
          ))}
        </div>
      </div>

      {totalPages > 1 ? (
        <PaginationControls
          currentPage={safePage}
          totalPages={totalPages}
          busy={loading}
          onPage={(page) => navigateQuery(pageHref(query, page))}
        />
      ) : null}

      <CatalogItemDetailModal itemId={openItemId} onClose={() => setOpenItemId(null)} />
      {filterDrawer}
    </div>
  )
}

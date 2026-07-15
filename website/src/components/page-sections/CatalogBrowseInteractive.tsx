'use client'

import {CatalogGridCardMedia} from '@/components/catalog/CatalogGridCardMedia'
import {CatalogItemDetailModal} from '@/components/catalog/CatalogItemDetailModal'
import {CatalogRingDotSpinner} from '@/components/catalog/CatalogRingDotSpinner'
import {prefetchCatalogItemDetailClient} from '@/lib/catalog/catalog-item-detail-client-fetch'
import {fetchCatalogBrowseClient, syncCatalogBrowseUrl} from '@/lib/catalog/catalog-browse-client-fetch'
import {catalogBrowseQueriesEqual} from '@/lib/catalog/catalog-browse-defaults'
import {
  brandItemHref,
  categoriesAllHref,
  categoryItemHref,
  marquesResetHref,
  pageHref,
  toggleAvailabilityHref,
  toggleColorHref,
  toggleSizeHref,
  withSort,
} from '@/lib/catalog/catalog-browse-href'
import {CATALOG_AVAILABILITY_OPTIONS} from '@/lib/catalog/catalog-availability'
import {buildPaginationRange} from '@/lib/catalog/catalog-pagination-range'
import {categoryRoots, childrenOf} from '@/lib/catalog/catalog-category-tree'
import type {CatalogBrowsePayload} from '@/lib/catalog/catalog-page-loader'
import {
  catalogCategoryChildLinkActive,
  catalogCategoryRootLinkActive,
  resolveCatalogFromQuery,
  type CatalogPathResolved,
} from '@/lib/catalog/catalog-path-resolve'
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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import styles from './websiteCatalogBrowse.module.css'

const SORT_OPTIONS: {id: CatalogSortMode; label: string}[] = [
  {id: 'recent', label: 'Nouveautés'},
  {id: 'price_asc', label: 'Prix : croissant'},
  {id: 'price_desc', label: 'Prix : décroissant'},
]

type FilterMenuId = 'categories' | 'brands' | 'colors' | 'sizes' | 'availability' | 'sort'

/** `segment` pointe vers une marque (sinon catégorie / all). */
function queryLooksLikeBrandFilter(resolved: CatalogPathResolved, query: CatalogBrowseQuery): boolean {
  if (resolved.kind === 'brand' || resolved.kind === 'intersection') return true
  if (!query.segmentSlug || query.subSlug) return false
  return resolved.kind === 'all'
}

function brandLinkActive(
  resolved: CatalogPathResolved,
  brand: MarketingCatalogFacetNavOption,
  query: CatalogBrowseQuery,
): boolean {
  if (resolved.kind === 'brand' || resolved.kind === 'intersection') {
    return resolved.brandSlug === brand.slug
  }
  // Fallback optimiste si le fetch n’a pas encore renvoyé `resolved`.
  return query.segmentSlug === brand.slug && !query.subSlug
}

function categoryRootChecked(
  resolved: CatalogPathResolved,
  root: MarketingCatalogFacetsNav['categories'][number],
  categories: MarketingCatalogFacetsNav['categories'],
  query: CatalogBrowseQuery,
): boolean {
  if (catalogCategoryRootLinkActive(resolved, root, categories)) return true
  return query.segmentSlug === root.slug && !query.subSlug
}

function categoryChildChecked(
  resolved: CatalogPathResolved,
  cat: MarketingCatalogFacetsNav['categories'][number],
  query: CatalogBrowseQuery,
): boolean {
  if (catalogCategoryChildLinkActive(resolved, cat)) return true
  return query.subSlug === cat.slug || (query.segmentSlug === cat.slug && !query.subSlug)
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
  return (
    <button
      type="button"
      className={`${styles.card} ${styles.cardButton}`}
      aria-label={`Voir ${titleLine}`}
      onClick={() => onOpen(it.id)}
      onMouseEnter={() => prefetchCatalogItemDetailClient(it.id)}
      onFocus={() => prefetchCatalogItemDetailClient(it.id)}
    >
      <div className={styles.cardMedia}>
        <CatalogGridCardMedia item={it} />
      </div>
      <div className={styles.cardBody}>
        <span className={styles.cardTitle}>{titleLine}</span>
        <div className={styles.cardMetaRow}>
          <span className={styles.cardSize}>{sizeLine}</span>
          {it.isSold ? null : (
            <span className={styles.cardPrice}>{formatCatalogPurchasePriceShort(it.price_points)}</span>
          )}
        </div>
      </div>
    </button>
  )
}

function QueryRailButton({
  className,
  children,
  disabled,
  onSelect,
}: {
  className: string
  children: ReactNode
  disabled?: boolean
  onSelect: () => void
}) {
  return (
    <button type="button" className={className} disabled={disabled} onClick={() => void onSelect()}>
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
}: {
  id: FilterMenuId
  label: string
  active?: boolean
  open: boolean
  onToggle: (id: FilterMenuId) => void
  children: ReactNode
  panelClassName?: string
}) {
  return (
    <div className={styles.filterDropdown}>
      <button
        type="button"
        className={`${styles.filterTrigger} ${active ? styles.filterTriggerActive : ''} ${open ? styles.filterTriggerOpen : ''}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => onToggle(id)}
      >
        <span>{label}</span>
        <svg
          className={`${styles.filterChevron} ${open ? styles.filterChevronOpen : ''}`}
          viewBox="0 0 24 24"
          width="16"
          height="16"
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
        <div className={`${styles.filterPanel} ${panelClassName ?? ''}`} role="listbox">
          {children}
        </div>
      ) : null}
    </div>
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
        <span className={styles.paginationNav} style={{opacity: 0.35}} aria-disabled>
          ‹&nbsp;PRÉCÉDENTE
        </span>
      ) : (
        <QueryRailButton
          className={styles.paginationNav}
          disabled={busy}
          onSelect={() => onPage(Math.max(1, currentPage - 1))}
        >
          ‹&nbsp;PRÉCÉDENTE
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
        <span className={styles.paginationNav} style={{opacity: 0.35}} aria-disabled>
          SUIVANTE&nbsp;›
        </span>
      ) : (
        <QueryRailButton
          className={styles.paginationNav}
          disabled={busy}
          onSelect={() => onPage(Math.min(totalPages, currentPage + 1))}
        >
          SUIVANTE&nbsp;›
        </QueryRailButton>
      )}
    </nav>
  )
}

export function CatalogBrowseInteractive({payload: initialPayload}: {payload: CatalogBrowsePayload}) {
  const [resolved, setResolved] = useState(initialPayload.resolved)
  const [facets, setFacets] = useState<MarketingCatalogFacetsNav>(initialPayload.facets)
  const [items, setItems] = useState(initialPayload.items)
  const [total, setTotal] = useState(initialPayload.total)
  const [query, setQuery] = useState(() => normalizeCatalogBrowseQuery(initialPayload.query))
  const [loading, setLoading] = useState(false)
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<FilterMenuId | null>(null)
  const [brandSearch, setBrandSearch] = useState('')
  const urlSynced = useRef(false)
  const filterBarRef = useRef<HTMLDivElement | null>(null)
  const fetchGenRef = useRef(0)
  /** Facettes complètes pour résoudre marque/catégorie côté client (évite les facettes scopées). */
  const resolveFacetsRef = useRef(initialPayload.facets)

  const applyQuery = useCallback(async (rawQuery: CatalogBrowseQuery) => {
    const nextQuery = normalizeCatalogBrowseQuery(rawQuery)
    const optimisticResolved =
      resolveCatalogFromQuery(resolveFacetsRef.current, nextQuery) ?? ({kind: 'all'} as const)
    const gen = ++fetchGenRef.current
    // UI immédiate : checks / URL / resolved — la grille reste affichée (fond gris soft + spinner).
    setLoading(true)
    setQuery(nextQuery)
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
      setQuery(normalizeCatalogBrowseQuery(data.query))
      if (data.resolved) setResolved(data.resolved)
      syncCatalogBrowseUrl(normalizeCatalogBrowseQuery(data.query))
    } catch {
      // Garde l’état optimiste + ancienne grille.
    } finally {
      if (gen === fetchGenRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (urlSynced.current) return
    urlSynced.current = true
    const urlQuery = normalizeCatalogBrowseQuery(
      parseCatalogBrowseQuery(new URLSearchParams(window.location.search)),
    )
    if (!catalogBrowseQueriesEqual(urlQuery, normalizeCatalogBrowseQuery(initialPayload.query))) {
      void applyQuery(urlQuery)
    }
  }, [applyQuery, initialPayload.query])

  useEffect(() => {
    if (!openMenu) return
    const onPointerDown = (e: PointerEvent) => {
      const root = filterBarRef.current
      if (root && !root.contains(e.target as Node)) setOpenMenu(null)
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

  const {shoeSizes, apparelSizes} = splitMarketingCatalogSizeFacets(facets.sizes)
  const pageSize = 30
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(query.page, totalPages)

  const brandActive =
    resolved.kind === 'brand' ||
    resolved.kind === 'intersection' ||
    (queryLooksLikeBrandFilter(resolved, query) && Boolean(query.segmentSlug))
  const categoryActive =
    resolved.kind === 'category' ||
    resolved.kind === 'intersection' ||
    Boolean(query.segmentSlug && !brandActive)
  const colorsActive = query.colorSlugs.length > 0
  const sizesActive = query.sizeSlugs.length > 0
  const availabilityActive = query.availabilitySlugs.length > 0
  const sortActive = query.sort !== 'recent'

  const filteredBrands = useMemo(() => {
    const needle = normalizeForSearch(brandSearch)
    if (!needle) return facets.brands
    return facets.brands.filter((b) => normalizeForSearch(b.label).includes(needle))
  }, [brandSearch, facets.brands])

  const sortLabel = SORT_OPTIONS.find((o) => o.id === query.sort)?.label ?? 'Trier'
  const itemCountLabel = loading
    ? '…'
    : `${total.toLocaleString('fr-FR')} pièce${total === 1 ? '' : 's'}`

  return (
    <div className={styles.catalogPageRoot} aria-busy={loading || undefined}>
      <div className={styles.filterBar} ref={filterBarRef}>
        <div className={styles.filterBarLeft}>
          <FilterDropdown
            id="categories"
            label="Catégorie"
            active={categoryActive}
            open={openMenu === 'categories'}
            onToggle={toggleMenu}
            panelClassName={styles.filterPanelWide}
          >
            <FilterCheckOption
              checked={!categoryActive}
              onClick={() => navigateQuery(categoriesAllHref(resolved, query))}
            >
              Toutes les catégories
            </FilterCheckOption>
            {categoryRoots(facets.categories).map((root) => {
              const subs = childrenOf(root.id, facets.categories)
              return (
                <div key={root.id} className={styles.filterOptionGroup}>
                  <FilterCheckOption
                    checked={categoryRootChecked(resolved, root, facets.categories, query)}
                    className={styles.filterOptionParent}
                    onClick={() =>
                      navigateQuery(categoryItemHref(resolved, root, facets.categories, query))
                    }
                  >
                    {root.label}
                  </FilterCheckOption>
                  {subs.length > 0 ? (
                    <div className={styles.filterOptionSub}>
                      {subs.map((c) => (
                        <FilterCheckOption
                          key={c.id}
                          checked={categoryChildChecked(resolved, c, query)}
                          onClick={() =>
                            navigateQuery(categoryItemHref(resolved, c, facets.categories, query))
                          }
                        >
                          {c.label}
                        </FilterCheckOption>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </FilterDropdown>

          <FilterDropdown
            id="brands"
            label="Marques"
            active={brandActive}
            open={openMenu === 'brands'}
            onToggle={toggleMenu}
            panelClassName={styles.filterPanelWide}
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
              checked={!brandActive}
              onClick={() => navigateQuery(marquesResetHref(resolved, query))}
            >
              Toutes les marques
            </FilterCheckOption>
            {filteredBrands.length === 0 ? (
              <p className={styles.filterEmpty}>Aucune marque ne correspond.</p>
            ) : (
              filteredBrands.map((b) => (
                <FilterCheckOption
                  key={b.id}
                  checked={brandLinkActive(resolved, b, query)}
                  onClick={() => navigateQuery(brandItemHref(resolved, b.slug, query))}
                >
                  {b.label}
                </FilterCheckOption>
              ))
            )}
          </FilterDropdown>

          <FilterDropdown
            id="colors"
            label="Couleur"
            active={colorsActive}
            open={openMenu === 'colors'}
            onToggle={toggleMenu}
          >
            {facets.colors.map((c) => (
              <FilterCheckOption
                key={c.id}
                checked={query.colorSlugs.includes(c.slug)}
                onClick={() => navigateQuery(toggleColorHref({...query, page: 1}, c.slug))}
              >
                {c.label}
              </FilterCheckOption>
            ))}
          </FilterDropdown>

          <FilterDropdown
            id="sizes"
            label="Taille"
            active={sizesActive}
            open={openMenu === 'sizes'}
            onToggle={toggleMenu}
            panelClassName={styles.filterPanelSizes}
          >
            {shoeSizes.length > 0 ? (
              <>
                <p className={styles.filterSectionLabel}>Pointures</p>
                {shoeSizes.map((s) => (
                  <FilterCheckOption
                    key={s.id}
                    checked={query.sizeSlugs.includes(s.slug)}
                    onClick={() => navigateQuery(toggleSizeHref({...query, page: 1}, s.slug))}
                  >
                    {s.label}
                  </FilterCheckOption>
                ))}
              </>
            ) : null}
            {apparelSizes.length > 0 ? (
              <>
                <p className={styles.filterSectionLabel}>Vêtements</p>
                {apparelSizes.map((s) => (
                  <FilterCheckOption
                    key={s.id}
                    checked={query.sizeSlugs.includes(s.slug)}
                    onClick={() => navigateQuery(toggleSizeHref({...query, page: 1}, s.slug))}
                  >
                    {s.label}
                  </FilterCheckOption>
                ))}
              </>
            ) : null}
            {shoeSizes.length === 0 && apparelSizes.length === 0 ? (
              <p className={styles.filterEmpty}>Aucune taille disponible.</p>
            ) : null}
          </FilterDropdown>

          <FilterDropdown
            id="availability"
            label="Disponibilité"
            active={availabilityActive}
            open={openMenu === 'availability'}
            onToggle={toggleMenu}
          >
            {CATALOG_AVAILABILITY_OPTIONS.map((o) => (
              <FilterCheckOption
                key={o.id}
                checked={query.availabilitySlugs.includes(o.id)}
                onClick={() => navigateQuery(toggleAvailabilityHref({...query, page: 1}, o.id))}
              >
                {o.label}
              </FilterCheckOption>
            ))}
          </FilterDropdown>
        </div>

        <div className={styles.filterBarRight}>
          <span className={`${styles.filterCount} ${loading ? styles.filterCountPending : ''}`}>
            {loading ? <CatalogRingDotSpinner aria-label="Chargement du catalogue" /> : null}
            <span>{itemCountLabel}</span>
          </span>
          <FilterDropdown
            id="sort"
            label={sortLabel}
            active={sortActive}
            open={openMenu === 'sort'}
            onToggle={toggleMenu}
            panelClassName={styles.filterPanelAlignEnd}
          >
            {SORT_OPTIONS.map((o) => (
              <FilterCheckOption
                key={o.id}
                checked={sortLinkActive(query, o.id)}
                onClick={() => navigateQuery(withSort({...query, page: 1}, o.id))}
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
        {loading ? (
          <div className={styles.browseLoadingOverlay}>
            <CatalogRingDotSpinner className={styles.browseLoadingSpinner} aria-label="Mise à jour du catalogue" />
          </div>
        ) : null}
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
    </div>
  )
}

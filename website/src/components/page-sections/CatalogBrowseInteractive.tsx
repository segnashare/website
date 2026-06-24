'use client'

import {CatalogBrowseLink} from '@/components/catalog/CatalogBrowseLink'
import {CatalogGridCardMedia} from '@/components/catalog/CatalogGridCardMedia'
import {CatalogBrandSearchRail} from '@/components/page-sections/CatalogBrandSearchRail'
import {fetchCatalogBrowseClient, syncCatalogBrowseUrl} from '@/lib/catalog/catalog-browse-client-fetch'
import {catalogBrowseQueriesEqual} from '@/lib/catalog/catalog-browse-defaults'
import {
  catalogBrowsePath,
  pageHref,
  toggleColorHref,
  toggleSizeHref,
  withSort,
} from '@/lib/catalog/catalog-browse-href'
import {buildPaginationRange} from '@/lib/catalog/catalog-pagination-range'
import {categoryRoots, childrenOf} from '@/lib/catalog/catalog-category-tree'
import type {CatalogBrowsePayload} from '@/lib/catalog/catalog-page-loader'
import {
  catalogBrandCategorySecondSegment,
  catalogCategoryChildLinkActive,
  catalogCategoryRootLinkActive,
  catalogCategoryRootNavOpen,
  catalogListingPath,
  type CatalogPathResolved,
} from '@/lib/catalog/catalog-path-resolve'
import {formatCatalogBorrowPriceLabel} from '@/lib/catalog/catalog-borrow-price-label'
import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import {parseCatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import {splitMarketingCatalogSizeFacets} from '@/lib/catalog/catalog-size-facet-section'
import type {
  CatalogSortMode,
  MarketingCatalogCategoryNavOption,
  MarketingCatalogFacetNavOption,
  MarketingCatalogFacetsNav,
  MarketingCatalogGridItem,
} from '@/lib/catalog/marketing-catalog-items'
import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react'
import styles from './websiteCatalogBrowse.module.css'

const SORT_OPTIONS: {id: CatalogSortMode; label: string}[] = [
  {id: 'recent', label: 'Nouveautés'},
  {id: 'price_asc', label: 'Prix : croissant'},
  {id: 'price_desc', label: 'Prix : décroissant'},
]

function categoriesAllHref(resolved: CatalogPathResolved): string {
  if (resolved.kind === 'intersection' || resolved.kind === 'brand') {
    return catalogBrowsePath(resolved.brandSlug, null)
  }
  return '/catalogue'
}

function categoryItemHref(
  resolved: CatalogPathResolved,
  cat: MarketingCatalogCategoryNavOption,
  categories: MarketingCatalogCategoryNavOption[],
): string {
  if (cat.parentId == null) {
    const brandSlug = resolved.kind === 'brand' || resolved.kind === 'intersection' ? resolved.brandSlug : null
    return catalogBrowsePath(brandSlug, cat.slug)
  }
  const parent = categories.find((c) => c.id === cat.parentId)
  if (resolved.kind === 'brand' || resolved.kind === 'intersection') {
    return catalogBrowsePath(resolved.brandSlug, cat.slug)
  }
  if (parent) {
    return catalogBrowsePath(parent.slug, cat.slug)
  }
  return catalogBrowsePath(null, cat.slug)
}

function brandItemHref(resolved: CatalogPathResolved, brandSlug: string): string {
  const second = catalogBrandCategorySecondSegment(resolved)
  if (second) return catalogBrowsePath(brandSlug, second)
  return catalogBrowsePath(brandSlug, null)
}

function brandsAllHref(resolved: CatalogPathResolved): string | null {
  if (resolved.kind === 'all') return null
  if (resolved.kind === 'brand') return '/catalogue'
  if (resolved.kind === 'category') return catalogListingPath(resolved)
  if (resolved.kind === 'intersection') return catalogBrowsePath(null, resolved.categorySlug)
  return null
}

function marquesResetHref(resolved: CatalogPathResolved): string {
  return brandsAllHref(resolved) ?? '/catalogue'
}

function brandLinkActive(resolved: CatalogPathResolved, brand: MarketingCatalogFacetNavOption): boolean {
  if (resolved.kind === 'brand') return resolved.brandSlug === brand.slug
  if (resolved.kind === 'intersection') return resolved.brandSlug === brand.slug
  return false
}

function sortLinkActive(query: CatalogBrowseQuery, mode: CatalogSortMode): boolean {
  return query.sort === mode
}

function GridCard({it}: {it: MarketingCatalogGridItem}) {
  const titleLine = it.displayTitle ?? it.title
  const brandLine = it.brand_label
  const extraLine = it.displaySubtitle?.trim()
  return (
    <CatalogBrowseLink href={`/catalogue/piece/${it.id}`} className={styles.card}>
      <div className={styles.cardMedia}>
        <CatalogGridCardMedia item={it} />
      </div>
      <div className={styles.cardBody}>
        {brandLine ? <span className={styles.cardBrand}>{brandLine}</span> : null}
        {extraLine ? <span className={styles.cardMetaLine}>{extraLine}</span> : null}
        <span className={styles.cardTitle}>{titleLine}</span>
        <span className={styles.cardPrice}>{formatCatalogBorrowPriceLabel(it.price_points)}</span>
      </div>
    </CatalogBrowseLink>
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

function PaginationControls({
  pathname,
  query,
  currentPage,
  totalPages,
  busy,
  onPage,
}: {
  pathname: string
  query: CatalogBrowseQuery
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

export function CatalogBrowseInteractive({
  payload: initialPayload,
  brandBand,
}: {
  payload: CatalogBrowsePayload
  brandBand?: ReactNode
}) {
  const {pathname, resolved} = initialPayload
  const [facets, setFacets] = useState<MarketingCatalogFacetsNav>(initialPayload.facets)
  const [items, setItems] = useState(initialPayload.items)
  const [total, setTotal] = useState(initialPayload.total)
  const [query, setQuery] = useState(initialPayload.query)
  const [loading, setLoading] = useState(false)
  const urlSynced = useRef(false)

  const applyQuery = useCallback(
    async (nextQuery: CatalogBrowseQuery) => {
      setLoading(true)
      try {
        const data = await fetchCatalogBrowseClient(pathname, nextQuery)
        if (data.facets) setFacets(data.facets)
        setItems(data.items)
        setTotal(data.total)
        setQuery(data.query)
        syncCatalogBrowseUrl(pathname, data.query)
      } catch {
        setItems([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [pathname],
  )

  useEffect(() => {
    if (urlSynced.current) return
    urlSynced.current = true
    const urlQuery = parseCatalogBrowseQuery(new URLSearchParams(window.location.search))
    if (!catalogBrowseQueriesEqual(urlQuery, initialPayload.query)) {
      void applyQuery(urlQuery)
    }
  }, [applyQuery, initialPayload.query])

  const navigateQuery = useCallback(
    (href: string) => {
      const u = new URL(href, window.location.origin)
      const nextQuery = parseCatalogBrowseQuery(u.searchParams)
      void applyQuery(nextQuery)
    },
    [applyQuery],
  )

  const {shoeSizes, apparelSizes} = splitMarketingCatalogSizeFacets(facets.sizes)
  const pageSize = 30
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(query.page, totalPages)

  const categoriesHeadingActive = resolved.kind === 'all' || resolved.kind === 'brand'
  const marquesHeadingActive = resolved.kind === 'all' || resolved.kind === 'category'

  return (
    <div className={styles.catalogPageRoot} aria-busy={loading || undefined}>
      <div className={styles.layoutBleed}>
        <aside className={styles.rail} aria-label="Catégories et marques">
          <div className={styles.railBlock}>
            <h3 className={styles.railTitle}>
              <CatalogBrowseLink
                href={categoriesAllHref(resolved)}
                className={`${styles.railTitleLink} ${categoriesHeadingActive ? styles.railTitleLinkActive : ''}`}
              >
                Catégories
              </CatalogBrowseLink>
            </h3>
            <ul className={styles.railList}>
              {categoryRoots(facets.categories).map((root) => {
                const open = catalogCategoryRootNavOpen(resolved, root.slug, facets.categories)
                const subs = childrenOf(root.id, facets.categories)
                return (
                  <li key={root.id} className={styles.railItem}>
                    <CatalogBrowseLink
                      href={categoryItemHref(resolved, root, facets.categories)}
                      className={`${styles.railLink} ${styles.railLinkParent} ${
                        catalogCategoryRootLinkActive(resolved, root, facets.categories) ? styles.railLinkActive : ''
                      }`}
                    >
                      {root.label}
                    </CatalogBrowseLink>
                    {open && subs.length > 0 ? (
                      <ul className={styles.railSubList}>
                        {subs.map((c) => (
                          <li key={c.id} className={styles.railSubItem}>
                            <CatalogBrowseLink
                              href={categoryItemHref(resolved, c, facets.categories)}
                              className={`${styles.railLink} ${
                                catalogCategoryChildLinkActive(resolved, c) ? styles.railLinkActive : ''
                              }`}
                            >
                              {c.label}
                            </CatalogBrowseLink>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
          <div className={styles.railBlock}>
            <h3 className={styles.railTitle}>
              <CatalogBrowseLink
                href={marquesResetHref(resolved)}
                className={`${styles.railTitleLink} ${marquesHeadingActive ? styles.railTitleLinkActive : ''}`}
              >
                Marques
              </CatalogBrowseLink>
            </h3>
            <CatalogBrandSearchRail
              brands={facets.brands.map((b) => ({
                id: b.id,
                label: b.label,
                href: brandItemHref(resolved, b.slug),
                active: brandLinkActive(resolved, b),
              }))}
            />
          </div>
        </aside>

        <div className={styles.center}>
          {brandBand ? <div className={styles.brandBand}>{brandBand}</div> : null}
          <div className={styles.grid}>
            {items.map((it) => (
              <GridCard key={it.id} it={it} />
            ))}
          </div>
        </div>

        <aside className={styles.rail} aria-label="Tri et couleurs">
          <div className={styles.railBlock}>
            <h3 className={styles.railTitle}>Trier</h3>
            <ul className={styles.railList}>
              {SORT_OPTIONS.map((o) => (
                <li key={o.id} className={styles.railItem}>
                  <QueryRailButton
                    className={`${styles.railLink} ${sortLinkActive(query, o.id) ? styles.railLinkActive : ''}`}
                    disabled={loading}
                    onSelect={() => navigateQuery(withSort(pathname, {...query, page: 1}, o.id))}
                  >
                    {o.label}
                  </QueryRailButton>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.railBlock}>
            <h3 className={styles.railTitle}>Couleurs</h3>
            <ul className={styles.railList}>
              {facets.colors.map((c) => (
                <li key={c.id} className={styles.railItem}>
                  <QueryRailButton
                    className={`${styles.railLink} ${query.colorSlugs.includes(c.slug) ? styles.railLinkActive : ''}`}
                    disabled={loading}
                    onSelect={() => navigateQuery(toggleColorHref(pathname, {...query, page: 1}, c.slug))}
                  >
                    {c.label}
                  </QueryRailButton>
                </li>
              ))}
            </ul>
          </div>
          {shoeSizes.length > 0 ? (
            <div className={styles.railBlock}>
              <h3 className={styles.railTitle}>Pointures</h3>
              <ul className={styles.railList}>
                {shoeSizes.map((s) => (
                  <li key={s.id} className={styles.railItem}>
                    <QueryRailButton
                      className={`${styles.railLink} ${query.sizeSlugs.includes(s.slug) ? styles.railLinkActive : ''}`}
                      disabled={loading}
                      onSelect={() => navigateQuery(toggleSizeHref(pathname, {...query, page: 1}, s.slug))}
                    >
                      {s.label}
                    </QueryRailButton>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {apparelSizes.length > 0 ? (
            <div className={styles.railBlock}>
              <h3 className={styles.railTitle}>Tailles</h3>
              <ul className={styles.railList}>
                {apparelSizes.map((s) => (
                  <li key={s.id} className={styles.railItem}>
                    <QueryRailButton
                      className={`${styles.railLink} ${query.sizeSlugs.includes(s.slug) ? styles.railLinkActive : ''}`}
                      disabled={loading}
                      onSelect={() => navigateQuery(toggleSizeHref(pathname, {...query, page: 1}, s.slug))}
                    >
                      {s.label}
                    </QueryRailButton>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>

      {totalPages > 1 ? (
        <PaginationControls
          pathname={pathname}
          query={{...query, page: safePage}}
          currentPage={safePage}
          totalPages={totalPages}
          busy={loading}
          onPage={(page) => navigateQuery(pageHref(pathname, query, page))}
        />
      ) : null}
    </div>
  )
}

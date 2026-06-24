'use client'

import {CatalogGridCardMedia} from '@/components/catalog/CatalogGridCardMedia'
import {CatalogItemDetailModal} from '@/components/catalog/CatalogItemDetailModal'
import {prefetchCatalogItemDetailClient} from '@/lib/catalog/catalog-item-detail-client-fetch'
import {CatalogBrandSearchRail} from '@/components/page-sections/CatalogBrandSearchRail'
import {fetchCatalogBrowseClient, syncCatalogBrowseUrl} from '@/lib/catalog/catalog-browse-client-fetch'
import {catalogBrowseQueriesEqual} from '@/lib/catalog/catalog-browse-defaults'
import {
  brandItemHref,
  categoriesAllHref,
  categoryItemHref,
  marquesResetHref,
  pageHref,
  toggleColorHref,
  toggleSizeHref,
  withSort,
} from '@/lib/catalog/catalog-browse-href'
import {buildPaginationRange} from '@/lib/catalog/catalog-pagination-range'
import {categoryRoots, childrenOf} from '@/lib/catalog/catalog-category-tree'
import type {CatalogBrowsePayload} from '@/lib/catalog/catalog-page-loader'
import {
  catalogCategoryChildLinkActive,
  catalogCategoryRootLinkActive,
  catalogCategoryRootNavOpen,
  type CatalogPathResolved,
} from '@/lib/catalog/catalog-path-resolve'
import {formatCatalogBorrowPriceLabel} from '@/lib/catalog/catalog-borrow-price-label'
import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import {parseCatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import {splitMarketingCatalogSizeFacets} from '@/lib/catalog/catalog-size-facet-section'
import type {
  CatalogSortMode,
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

function brandLinkActive(resolved: CatalogPathResolved, brand: MarketingCatalogFacetNavOption): boolean {
  if (resolved.kind === 'brand') return resolved.brandSlug === brand.slug
  if (resolved.kind === 'intersection') return resolved.brandSlug === brand.slug
  return false
}

function sortLinkActive(query: CatalogBrowseQuery, mode: CatalogSortMode): boolean {
  return query.sort === mode
}

function GridCard({it, onOpen}: {it: MarketingCatalogGridItem; onOpen: (itemId: string) => void}) {
  const titleLine = it.displayTitle ?? it.title
  const brandLine = it.brand_label
  const extraLine = it.displaySubtitle?.trim()
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
        {brandLine ? <span className={styles.cardBrand}>{brandLine}</span> : null}
        {extraLine ? <span className={styles.cardMetaLine}>{extraLine}</span> : null}
        <span className={styles.cardTitle}>{titleLine}</span>
        <span className={styles.cardPrice}>{formatCatalogBorrowPriceLabel(it.price_points)}</span>
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

function PaginationControls({
  query,
  currentPage,
  totalPages,
  busy,
  onPage,
}: {
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

export function CatalogBrowseInteractive({payload: initialPayload}: {payload: CatalogBrowsePayload}) {
  const {resolved} = initialPayload
  const [facets, setFacets] = useState<MarketingCatalogFacetsNav>(initialPayload.facets)
  const [items, setItems] = useState(initialPayload.items)
  const [total, setTotal] = useState(initialPayload.total)
  const [query, setQuery] = useState(initialPayload.query)
  const [loading, setLoading] = useState(false)
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const urlSynced = useRef(false)

  const applyQuery = useCallback(async (nextQuery: CatalogBrowseQuery) => {
    setLoading(true)
    try {
      const data = await fetchCatalogBrowseClient(nextQuery)
      if (data.facets) setFacets(data.facets)
      setItems(data.items)
      setTotal(data.total)
      setQuery(data.query)
      syncCatalogBrowseUrl(data.query)
    } catch {
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

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
              <QueryRailButton
                className={`${styles.railTitleLink} ${categoriesHeadingActive ? styles.railTitleLinkActive : ''}`}
                disabled={loading}
                onSelect={() => navigateQuery(categoriesAllHref(resolved, query))}
              >
                Catégories
              </QueryRailButton>
            </h3>
            <ul className={styles.railList}>
              {categoryRoots(facets.categories).map((root) => {
                const open = catalogCategoryRootNavOpen(resolved, root.slug, facets.categories)
                const subs = childrenOf(root.id, facets.categories)
                return (
                  <li key={root.id} className={styles.railItem}>
                    <QueryRailButton
                      className={`${styles.railLink} ${styles.railLinkParent} ${
                        catalogCategoryRootLinkActive(resolved, root, facets.categories) ? styles.railLinkActive : ''
                      }`}
                      disabled={loading}
                      onSelect={() =>
                        navigateQuery(categoryItemHref(resolved, root, facets.categories, query))
                      }
                    >
                      {root.label}
                    </QueryRailButton>
                    {open && subs.length > 0 ? (
                      <ul className={styles.railSubList}>
                        {subs.map((c) => (
                          <li key={c.id} className={styles.railSubItem}>
                            <QueryRailButton
                              className={`${styles.railLink} ${
                                catalogCategoryChildLinkActive(resolved, c) ? styles.railLinkActive : ''
                              }`}
                              disabled={loading}
                              onSelect={() =>
                                navigateQuery(categoryItemHref(resolved, c, facets.categories, query))
                              }
                            >
                              {c.label}
                            </QueryRailButton>
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
              <QueryRailButton
                className={`${styles.railTitleLink} ${marquesHeadingActive ? styles.railTitleLinkActive : ''}`}
                disabled={loading}
                onSelect={() => navigateQuery(marquesResetHref(resolved, query))}
              >
                Marques
              </QueryRailButton>
            </h3>
            <CatalogBrandSearchRail
              brands={facets.brands.map((b) => ({
                id: b.id,
                label: b.label,
                slug: b.slug,
                active: brandLinkActive(resolved, b),
              }))}
              disabled={loading}
              onBrandSelect={(brandSlug) => navigateQuery(brandItemHref(resolved, brandSlug, query))}
            />
          </div>
        </aside>

        <div className={styles.center}>
          <div className={styles.grid}>
            {items.map((it) => (
              <GridCard key={it.id} it={it} onOpen={setOpenItemId} />
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
                    onSelect={() => navigateQuery(withSort({...query, page: 1}, o.id))}
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
                    onSelect={() => navigateQuery(toggleColorHref({...query, page: 1}, c.slug))}
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
                      onSelect={() => navigateQuery(toggleSizeHref({...query, page: 1}, s.slug))}
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
                      onSelect={() => navigateQuery(toggleSizeHref({...query, page: 1}, s.slug))}
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
          query={{...query, page: safePage}}
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

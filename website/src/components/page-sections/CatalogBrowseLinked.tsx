import Image from 'next/image'
import Link from 'next/link'
import type {ReactNode} from 'react'
import {buildPaginationRange} from '@/lib/catalog/catalog-pagination-range'
import {
  catalogBrowsePath,
  pageHref,
  toggleColorHref,
  toggleSizeHref,
  withQuery,
  withSort,
} from '@/lib/catalog/catalog-browse-href'
import {categoryRoots, childrenOf} from '@/lib/catalog/catalog-category-tree'
import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import {
  catalogBrandCategorySecondSegment,
  catalogCategoryChildLinkActive,
  catalogCategoryRootLinkActive,
  catalogCategoryRootNavOpen,
  catalogListingPath,
  type CatalogPathResolved,
} from '@/lib/catalog/catalog-path-resolve'
import type {CatalogBrowsePayload} from '@/lib/catalog/catalog-page-loader'
import {splitMarketingCatalogSizeFacets} from '@/lib/catalog/catalog-size-facet-section'
import type {
  CatalogSortMode,
  MarketingCatalogCategoryNavOption,
  MarketingCatalogFacetNavOption,
  MarketingCatalogGridItem,
} from '@/lib/catalog/marketing-catalog-items'
import {CatalogBrandSearchRail} from '@/components/page-sections/CatalogBrandSearchRail'
import styles from './websiteCatalogBrowse.module.css'

const SORT_OPTIONS: {id: CatalogSortMode; label: string}[] = [
  {id: 'recent', label: 'Nouveautés'},
  {id: 'price_asc', label: 'Prix : croissant'},
  {id: 'price_desc', label: 'Prix : décroissant'},
]

function priceLabel(p: number | null): string {
  if (typeof p === 'number' && !Number.isNaN(p)) return `${p} pts`
  return '—'
}

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

/** Réinitialise les marques (comme l’ancien lien « Toutes ») : racine ou catégorie seule. */
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
    <Link href={`/catalogue/piece/${it.id}`} className={styles.card}>
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

function PaginationLinks({
  pathname,
  query,
  currentPage,
  totalPages,
}: {
  pathname: string
  query: CatalogBrowseQuery
  currentPage: number
  totalPages: number
}) {
  const range = buildPaginationRange(currentPage, totalPages)
  const prevHref = pageHref(pathname, query, Math.max(1, currentPage - 1))
  const nextHref = pageHref(pathname, query, Math.min(totalPages, currentPage + 1))
  return (
    <nav className={styles.pagination} aria-label="Pagination catalogue">
      {currentPage <= 1 ? (
        <span className={styles.paginationNav} style={{opacity: 0.35}} aria-disabled>
          ‹&nbsp;PRÉCÉDENTE
        </span>
      ) : (
        <Link href={prevHref} className={styles.paginationNav}>
          ‹&nbsp;PRÉCÉDENTE
        </Link>
      )}
      <div className={styles.paginationPages}>
        {range.map((cell, idx) =>
          cell === 'ellipsis' ? (
            <span key={`e-${idx}`} className={styles.paginationEllipsis}>
              …
            </span>
          ) : (
            <Link
              key={cell}
              href={pageHref(pathname, query, cell)}
              className={`${styles.paginationNum} ${cell === currentPage ? styles.paginationNumActive : ''}`}
            >
              {cell}
            </Link>
          ),
        )}
      </div>
      {currentPage >= totalPages ? (
        <span className={styles.paginationNav} style={{opacity: 0.35}} aria-disabled>
          SUIVANTE&nbsp;›
        </span>
      ) : (
        <Link href={nextHref} className={styles.paginationNav}>
          SUIVANTE&nbsp;›
        </Link>
      )}
    </nav>
  )
}

export function CatalogBrowseLinked({payload, brandBand}: {payload: CatalogBrowsePayload; brandBand?: ReactNode}) {
  const {facets, items, total, pathname, resolved, query} = payload
  const {shoeSizes, apparelSizes} = splitMarketingCatalogSizeFacets(facets.sizes)
  const pageSize = 50
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(query.page, totalPages)

  const categoriesHeadingActive = resolved.kind === 'all' || resolved.kind === 'brand'
  const marquesHeadingActive = resolved.kind === 'all' || resolved.kind === 'category'
  const catResetHref = withQuery(categoriesAllHref(resolved), {...query, page: 1})
  const marquesResetHrefFull = withQuery(marquesResetHref(resolved), {...query, page: 1})

  return (
    <div className={styles.catalogPageRoot}>
      <div className={styles.layoutBleed}>
        <aside className={styles.rail} aria-label="Catégories et marques">
          <div className={styles.railBlock}>
            <h3 className={styles.railTitle}>
              <Link
                href={catResetHref}
                className={`${styles.railTitleLink} ${categoriesHeadingActive ? styles.railTitleLinkActive : ''}`}
              >
                Catégories
              </Link>
            </h3>
            <ul className={styles.railList}>
              {categoryRoots(facets.categories).map((root) => {
                const open = catalogCategoryRootNavOpen(resolved, root.slug, facets.categories)
                const subs = childrenOf(root.id, facets.categories)
                return (
                  <li key={root.id} className={styles.railItem}>
                    <Link
                      href={withQuery(categoryItemHref(resolved, root, facets.categories), {...query, page: 1})}
                      className={`${styles.railLink} ${styles.railLinkParent} ${
                        catalogCategoryRootLinkActive(resolved, root, facets.categories) ? styles.railLinkActive : ''
                      }`}
                    >
                      {root.label}
                    </Link>
                    {open && subs.length > 0 ? (
                      <ul className={styles.railSubList}>
                        {subs.map((c) => (
                          <li key={c.id} className={styles.railSubItem}>
                            <Link
                              href={withQuery(categoryItemHref(resolved, c, facets.categories), {...query, page: 1})}
                              className={`${styles.railLink} ${
                                catalogCategoryChildLinkActive(resolved, c) ? styles.railLinkActive : ''
                              }`}
                            >
                              {c.label}
                            </Link>
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
              <Link
                href={marquesResetHrefFull}
                className={`${styles.railTitleLink} ${marquesHeadingActive ? styles.railTitleLinkActive : ''}`}
              >
                Marques
              </Link>
            </h3>
            <CatalogBrandSearchRail
              brands={facets.brands.map((b) => ({
                id: b.id,
                label: b.label,
                href: withQuery(brandItemHref(resolved, b.slug), {...query, page: 1}),
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
                  <Link
                    href={withSort(pathname, {...query, page: 1}, o.id)}
                    className={`${styles.railLink} ${sortLinkActive(query, o.id) ? styles.railLinkActive : ''}`}
                  >
                    {o.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.railBlock}>
            <h3 className={styles.railTitle}>Couleurs</h3>
            <ul className={styles.railList}>
              {facets.colors.map((c) => (
                <li key={c.id} className={styles.railItem}>
                  <Link
                    href={toggleColorHref(pathname, {...query, page: 1}, c.slug)}
                    className={`${styles.railLink} ${query.colorSlugs.includes(c.slug) ? styles.railLinkActive : ''}`}
                  >
                    {c.label}
                  </Link>
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
                    <Link
                      href={toggleSizeHref(pathname, {...query, page: 1}, s.slug)}
                      className={`${styles.railLink} ${query.sizeSlugs.includes(s.slug) ? styles.railLinkActive : ''}`}
                    >
                      {s.label}
                    </Link>
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
                    <Link
                      href={toggleSizeHref(pathname, {...query, page: 1}, s.slug)}
                      className={`${styles.railLink} ${query.sizeSlugs.includes(s.slug) ? styles.railLinkActive : ''}`}
                    >
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>

      {totalPages > 1 ? (
        <PaginationLinks pathname={pathname} query={{...query, page: safePage}} currentPage={safePage} totalPages={totalPages} />
      ) : null}
    </div>
  )
}

'use client'

import Image from 'next/image'
import Link from 'next/link'
import {useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react'
import {createPortal} from 'react-dom'
import {usePathname, useRouter, useSearchParams} from 'next/navigation'
import {objectPositionFromHotspot} from '@/lib/homeStagedPlacements'
import {
  NEWSROOM_ARTICLE_TYPES,
  NEWSROOM_SORT_OPTIONS,
  isNewsroomArticleTypeId,
  isNewsroomSortId,
  newsroomArticleTypeLabel,
  type NewsroomArticleTypeId,
  type NewsroomSortId,
} from '@/lib/newsroom-article-types'
import {buildPaginationRange} from '@/lib/catalog/catalog-pagination-range'
import {urlFor, type PostData} from '@/lib/sanity'
import catalogStyles from '@/components/page-sections/websiteCatalogBrowse.module.css'
import styles from '@/app/(marketing)/newsroom/newsroom.module.css'

const PAGE_SIZE = 10

type Props = {
  posts: PostData[]
}

function formatShortDate(value?: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric'}).format(date)
}

function postHref(post: PostData) {
  const slug = post.slug?.current?.trim()
  return slug ? `/newsroom/${slug}` : null
}

function resolveArticleType(post: PostData): NewsroomArticleTypeId | null {
  if (isNewsroomArticleTypeId(post.articleType)) return post.articleType
  return null
}

function FilterDropdown({
  id,
  label,
  open,
  active,
  onOpenChange,
  children,
  panelClassName,
  plain,
}: {
  id: string
  label: string
  open: boolean
  active?: boolean
  onOpenChange: (id: string | null) => void
  children: ReactNode
  panelClassName?: string
  /** Style texte (barre mobile) plutôt que pill catalogue. */
  plain?: boolean
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onOpenChange(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(null)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onOpenChange])

  const triggerClass = plain
    ? `${styles.mobileToolbarBtn} ${active ? styles.mobileToolbarBtnActive : ''}`
    : `${catalogStyles.filterTrigger} ${open || active ? catalogStyles.filterTriggerOpen : ''} ${active ? catalogStyles.filterTriggerActive : ''}`

  return (
    <div className={catalogStyles.filterDropdown} ref={rootRef}>
      <button
        type="button"
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => onOpenChange(open ? null : id)}
      >
        {label}
        <svg
          className={
            plain
              ? `${styles.mobileToolbarChevron} ${open ? styles.mobileToolbarChevronOpen : ''}`
              : `${catalogStyles.filterChevron} ${open ? catalogStyles.filterChevronOpen : ''}`
          }
          viewBox="0 0 16 16"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
          />
        </svg>
      </button>
      {open ? (
        <div className={`${catalogStyles.filterPanel} ${panelClassName ?? ''}`} role="listbox">
          {children}
        </div>
      ) : null}
    </div>
  )
}

function FilterOption({
  checked,
  onSelect,
  children,
}: {
  checked: boolean
  onSelect: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={checked}
      className={`${catalogStyles.filterOption} ${checked ? catalogStyles.filterOptionChecked : ''}`}
      onClick={onSelect}
    >
      <span className={catalogStyles.filterOptionLabel}>{children}</span>
    </button>
  )
}

function PostCard({post}: {post: PostData}) {
  const href = postHref(post)
  const dateLabel = formatShortDate(post.publishedAt)
  const typeLabel = newsroomArticleTypeLabel(resolveArticleType(post))
  const meta = [typeLabel, dateLabel].filter(Boolean).join(' | ')
  const imageUrl =
    post.image?.asset && (post.image.asset._ref || post.image.asset.url)
      ? urlFor(post.image).width(1200).height(800).fit('crop').auto('format').url()
      : null
  const objectPosition = objectPositionFromHotspot(post.image?.hotspot)

  const body = (
    <>
      <div className={styles.cardMedia}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={post.image?.alt?.trim() || post.title}
            fill
            sizes="(max-width: 39.99rem) 100vw, (max-width: 63.99rem) 50vw, 33vw"
            className={styles.cardImage}
            style={{
              objectFit: 'cover',
              ...(objectPosition ? {objectPosition} : {}),
            }}
          />
        ) : null}
      </div>
      <div className={styles.cardBody}>
        <h2 className={styles.cardTitle}>{post.title}</h2>
        {meta ? <p className={styles.cardMeta}>{meta}</p> : null}
        {post.excerpt?.trim() ? <p className={styles.cardExcerpt}>{post.excerpt.trim()}</p> : null}
      </div>
    </>
  )

  if (!href) return <article className={styles.card}>{body}</article>
  return (
    <Link href={href} className={styles.card}>
      {body}
    </Link>
  )
}

function sortPosts(posts: PostData[], sort: NewsroomSortId): PostData[] {
  const next = [...posts]
  next.sort((a, b) => {
    if (sort === 'title_asc' || sort === 'title_desc') {
      const cmp = (a.title || '').localeCompare(b.title || '', 'fr', {sensitivity: 'base'})
      return sort === 'title_asc' ? cmp : -cmp
    }
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
    return sort === 'oldest' ? ta - tb : tb - ta
  })
  return next
}

function parsePageParam(raw: string | null): number {
  const n = Number.parseInt(raw || '1', 10)
  return Number.isFinite(n) && n >= 1 ? n : 1
}

function NewsroomPagination({
  currentPage,
  totalPages,
  onPage,
}: {
  currentPage: number
  totalPages: number
  onPage: (page: number) => void
}) {
  const range = buildPaginationRange(currentPage, totalPages)
  return (
    <nav className={catalogStyles.pagination} aria-label="Pagination newsroom">
      {currentPage <= 1 ? (
        <span className={catalogStyles.paginationNav} style={{opacity: 0.35}} aria-disabled aria-label="Précédente">
          ‹<span className={catalogStyles.paginationNavLabel}>&nbsp;PRÉCÉDENTE</span>
        </span>
      ) : (
        <button
          type="button"
          className={catalogStyles.paginationNav}
          aria-label="Précédente"
          onClick={() => onPage(Math.max(1, currentPage - 1))}
        >
          ‹<span className={catalogStyles.paginationNavLabel}>&nbsp;PRÉCÉDENTE</span>
        </button>
      )}
      <div className={catalogStyles.paginationPages}>
        {range.map((cell, idx) =>
          cell === 'ellipsis' ? (
            <span key={`e-${idx}`} className={catalogStyles.paginationEllipsis}>
              …
            </span>
          ) : (
            <button
              key={cell}
              type="button"
              className={`${catalogStyles.paginationNum} ${cell === currentPage ? catalogStyles.paginationNumActive : ''}`}
              aria-current={cell === currentPage ? 'page' : undefined}
              onClick={() => onPage(cell)}
            >
              {cell}
            </button>
          ),
        )}
      </div>
      {currentPage >= totalPages ? (
        <span className={catalogStyles.paginationNav} style={{opacity: 0.35}} aria-disabled aria-label="Suivante">
          <span className={catalogStyles.paginationNavLabel}>SUIVANTE&nbsp;</span>›
        </span>
      ) : (
        <button
          type="button"
          className={catalogStyles.paginationNav}
          aria-label="Suivante"
          onClick={() => onPage(Math.min(totalPages, currentPage + 1))}
        >
          <span className={catalogStyles.paginationNavLabel}>SUIVANTE&nbsp;</span>›
        </button>
      )}
    </nav>
  )
}

function FilterIcon() {
  return (
    <svg className={styles.mobileToolbarIcon} viewBox="0 0 16 16" aria-hidden>
      <path
        fill="currentColor"
        d="M1.5 3.25a.75.75 0 0 1 .75-.75h11.5a.75.75 0 0 1 0 1.5H2.25a.75.75 0 0 1-.75-.75Zm2 4.5a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75Zm2 4.5a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75Z"
      />
    </svg>
  )
}

export function NewsroomBrowse({posts}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [draftType, setDraftType] = useState<string | null>(null)
  const [portalReady, setPortalReady] = useState(false)

  const typeParam = searchParams.get('type')
  const sortParam = searchParams.get('sort')
  const pageParam = searchParams.get('page')
  const typeFilter = isNewsroomArticleTypeId(typeParam) ? typeParam : null
  const sort: NewsroomSortId = isNewsroomSortId(sortParam) ? sortParam : 'recent'
  const requestedPage = parsePageParam(pageParam)

  useEffect(() => {
    setPortalReady(true)
  }, [])

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

  const replaceQuery = useCallback(
    (nextType: string | null, nextSort: NewsroomSortId, nextPage = 1) => {
      const sp = new URLSearchParams()
      if (nextType) sp.set('type', nextType)
      if (nextSort !== 'recent') sp.set('sort', nextSort)
      if (nextPage > 1) sp.set('page', String(nextPage))
      const qs = sp.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, {scroll: false})
      setOpenMenu(null)
    },
    [pathname, router],
  )

  const openFilterDrawer = useCallback(() => {
    setDraftType(typeFilter)
    setOpenMenu(null)
    setFilterDrawerOpen(true)
  }, [typeFilter])

  const applyFilterDrawer = useCallback(() => {
    const next =
      draftType && isNewsroomArticleTypeId(draftType) ? draftType : null
    replaceQuery(next, sort, 1)
    setFilterDrawerOpen(false)
  }, [draftType, replaceQuery, sort])

  const visible = useMemo(() => {
    const filtered = typeFilter
      ? posts.filter((p) => resolveArticleType(p) === typeFilter)
      : posts
    return sortPosts(filtered, sort)
  }, [posts, typeFilter, sort])

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const currentPage = Math.min(requestedPage, totalPages)
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return visible.slice(start, start + PAGE_SIZE)
  }, [visible, currentPage])

  useEffect(() => {
    if (requestedPage !== currentPage) {
      replaceQuery(typeFilter, sort, currentPage)
    }
  }, [requestedPage, currentPage, typeFilter, sort, replaceQuery])

  const goToPage = useCallback(
    (page: number) => {
      replaceQuery(typeFilter, sort, page)
      if (typeof window !== 'undefined') {
        window.scrollTo({top: 0, behavior: 'smooth'})
      }
    },
    [replaceQuery, typeFilter, sort],
  )

  const typeLabel = typeFilter
    ? NEWSROOM_ARTICLE_TYPES.find((t) => t.id === typeFilter)?.label ?? 'Type'
    : 'Type'
  const sortLabel = NEWSROOM_SORT_OPTIONS.find((s) => s.id === sort)?.label ?? 'Trier'

  if (posts.length === 0) {
    return <p className={styles.empty}>Aucun post publié pour le moment.</p>
  }

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
              aria-labelledby="newsroom-filter-drawer-title"
            >
              <header className={styles.filterDrawerHeader}>
                <h2 id="newsroom-filter-drawer-title" className={styles.filterDrawerTitle}>
                  Filtres
                </h2>
                <button
                  type="button"
                  className={styles.filterDrawerClose}
                  aria-label="Fermer"
                  onClick={() => setFilterDrawerOpen(false)}
                >
                  ✕
                </button>
              </header>
              <div className={styles.filterDrawerBody}>
                <p className={styles.filterDrawerSectionLabel}>Type</p>
                <button
                  type="button"
                  className={`${styles.filterDrawerOption} ${!draftType ? styles.filterDrawerOptionActive : ''}`}
                  onClick={() => setDraftType(null)}
                >
                  <span>Tous les types</span>
                  {!draftType ? <span className={styles.filterDrawerCheck}>✓</span> : null}
                </button>
                {NEWSROOM_ARTICLE_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`${styles.filterDrawerOption} ${draftType === t.id ? styles.filterDrawerOptionActive : ''}`}
                    onClick={() => setDraftType(t.id)}
                  >
                    <span>{t.label}</span>
                    {draftType === t.id ? <span className={styles.filterDrawerCheck}>✓</span> : null}
                  </button>
                ))}
              </div>
              <footer className={styles.filterDrawerFooter}>
                <button type="button" className={styles.filterDrawerApply} onClick={applyFilterDrawer}>
                  Voir les résultats
                </button>
                <button
                  type="button"
                  className={styles.filterDrawerReset}
                  onClick={() => {
                    setDraftType(null)
                    replaceQuery(null, sort, 1)
                    setFilterDrawerOpen(false)
                  }}
                >
                  Réinitialiser
                </button>
              </footer>
            </aside>
          </div>,
          document.body,
        )
      : null

  return (
    <section aria-label="Actualités">
      <div className={styles.mobileToolbar}>
        <button
          type="button"
          className={`${styles.mobileToolbarBtn} ${typeFilter ? styles.mobileToolbarBtnActive : ''}`}
          onClick={openFilterDrawer}
        >
          <FilterIcon />
          Filtres
        </button>
        <FilterDropdown
          id="sort-mobile"
          label={sortLabel}
          open={openMenu === 'sort-mobile'}
          active={sort !== 'recent'}
          onOpenChange={setOpenMenu}
          panelClassName={catalogStyles.filterPanelAlignEnd}
          plain
        >
          {NEWSROOM_SORT_OPTIONS.map((s) => (
            <FilterOption
              key={s.id}
              checked={sort === s.id}
              onSelect={() => replaceQuery(typeFilter, s.id, 1)}
            >
              {s.label}
            </FilterOption>
          ))}
        </FilterDropdown>
      </div>

      <div className={`${styles.desktopToolbar}`}>
        <div className={`${catalogStyles.filterBar} ${catalogStyles.filterBarCompact}`}>
          <div className={catalogStyles.filterBarLeft}>
            <FilterDropdown
              id="type"
              label={typeLabel}
              open={openMenu === 'type'}
              active={Boolean(typeFilter)}
              onOpenChange={setOpenMenu}
              panelClassName={catalogStyles.filterPanelWide}
            >
              <FilterOption checked={!typeFilter} onSelect={() => replaceQuery(null, sort, 1)}>
                Tous les types
              </FilterOption>
              {NEWSROOM_ARTICLE_TYPES.map((t) => (
                <FilterOption
                  key={t.id}
                  checked={typeFilter === t.id}
                  onSelect={() => replaceQuery(t.id, sort, 1)}
                >
                  {t.label}
                </FilterOption>
              ))}
            </FilterDropdown>
          </div>
          <div className={catalogStyles.filterBarRight}>
            <FilterDropdown
              id="sort"
              label={sortLabel}
              open={openMenu === 'sort'}
              active={sort !== 'recent'}
              onOpenChange={setOpenMenu}
              panelClassName={catalogStyles.filterPanelAlignEnd}
            >
              {NEWSROOM_SORT_OPTIONS.map((s) => (
                <FilterOption
                  key={s.id}
                  checked={sort === s.id}
                  onSelect={() => replaceQuery(typeFilter, s.id, 1)}
                >
                  {s.label}
                </FilterOption>
              ))}
            </FilterDropdown>
          </div>
        </div>
      </div>

      {filterDrawer}

      {visible.length > 0 ? (
        <>
          <div className={styles.grid}>
            {pageItems.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
          {totalPages > 1 ? (
            <NewsroomPagination currentPage={currentPage} totalPages={totalPages} onPage={goToPage} />
          ) : null}
        </>
      ) : (
        <p className={styles.empty}>Aucun article pour ce filtre.</p>
      )}
    </section>
  )
}

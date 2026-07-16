'use client'

import Image from 'next/image'
import Link from 'next/link'
import {useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react'
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
import {urlFor, type PostData} from '@/lib/sanity'
import catalogStyles from '@/components/page-sections/websiteCatalogBrowse.module.css'
import styles from '@/app/(marketing)/newsroom/newsroom.module.css'

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
}: {
  id: string
  label: string
  open: boolean
  active?: boolean
  onOpenChange: (id: string | null) => void
  children: ReactNode
  panelClassName?: string
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

  return (
    <div className={catalogStyles.filterDropdown} ref={rootRef}>
      <button
        type="button"
        className={`${catalogStyles.filterTrigger} ${open || active ? catalogStyles.filterTriggerOpen : ''} ${active ? catalogStyles.filterTriggerActive : ''}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => onOpenChange(open ? null : id)}
      >
        {label}
        <svg
          className={`${catalogStyles.filterChevron} ${open ? catalogStyles.filterChevronOpen : ''}`}
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

export function NewsroomBrowse({posts}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const typeParam = searchParams.get('type')
  const sortParam = searchParams.get('sort')
  const typeFilter = isNewsroomArticleTypeId(typeParam) ? typeParam : null
  const sort: NewsroomSortId = isNewsroomSortId(sortParam) ? sortParam : 'recent'

  const replaceQuery = useCallback(
    (nextType: string | null, nextSort: NewsroomSortId) => {
      const sp = new URLSearchParams()
      if (nextType) sp.set('type', nextType)
      if (nextSort !== 'recent') sp.set('sort', nextSort)
      const qs = sp.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, {scroll: false})
      setOpenMenu(null)
    },
    [pathname, router],
  )

  const visible = useMemo(() => {
    const filtered = typeFilter
      ? posts.filter((p) => resolveArticleType(p) === typeFilter)
      : posts
    return sortPosts(filtered, sort)
  }, [posts, typeFilter, sort])

  const typeLabel = typeFilter
    ? NEWSROOM_ARTICLE_TYPES.find((t) => t.id === typeFilter)?.label ?? 'Type'
    : 'Type'
  const sortLabel = NEWSROOM_SORT_OPTIONS.find((s) => s.id === sort)?.label ?? 'Trier'

  if (posts.length === 0) {
    return <p className={styles.empty}>Aucun post publié pour le moment.</p>
  }

  return (
    <section aria-label="Actualités">
      <div className={catalogStyles.filterBar}>
        <div className={catalogStyles.filterBarLeft}>
          <FilterDropdown
            id="type"
            label={typeLabel}
            open={openMenu === 'type'}
            active={Boolean(typeFilter)}
            onOpenChange={setOpenMenu}
            panelClassName={catalogStyles.filterPanelWide}
          >
            <FilterOption checked={!typeFilter} onSelect={() => replaceQuery(null, sort)}>
              Tous les types
            </FilterOption>
            {NEWSROOM_ARTICLE_TYPES.map((t) => (
              <FilterOption
                key={t.id}
                checked={typeFilter === t.id}
                onSelect={() => replaceQuery(t.id, sort)}
              >
                {t.label}
              </FilterOption>
            ))}
          </FilterDropdown>
        </div>
        <div className={catalogStyles.filterBarRight}>
          <span className={catalogStyles.filterCount}>
            {visible.length} article{visible.length > 1 ? 's' : ''}
          </span>
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
                onSelect={() => replaceQuery(typeFilter, s.id)}
              >
                {s.label}
              </FilterOption>
            ))}
          </FilterDropdown>
        </div>
      </div>

      {visible.length > 0 ? (
        <div className={styles.grid}>
          {visible.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>Aucun article pour ce filtre.</p>
      )}
    </section>
  )
}

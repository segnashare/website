import type {SanityImage} from '@/lib/sanity'
import {urlForCatalogStripImage} from '@/lib/sanity'
import type {WebsiteDbCatalogSection} from '@/lib/sanity'
import type {MarketingCatalogGridItem, MarketingCatalogItemRow} from '@/lib/catalog/marketing-catalog-items'
import {getFirstPhotoCoverMeta} from '@/lib/catalog/item-photos'
import {resolveCatalogCardBadges, getMarketingCatalogNewestIdSet} from '@/lib/catalog/catalog-card-badges'
import {fetchMarketingCatalogItemsByIds, fetchMarketingCatalogItemsFull, resolveCoverUrlsForItems} from '@/lib/catalog/marketing-catalog-items'
import {loadCatalogBrowse} from '@/lib/catalog/catalog-page-loader'
import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'
import {objectPositionFromHotspot} from '@/lib/homeStagedPlacements'
import {CatalogScrollStrip} from '@/components/catalog/CatalogScrollStrip'
import {CatalogScrollStripSkeleton} from '@/components/catalog/CatalogScrollStripSkeleton'
import {CatalogBrowseLinked} from '@/components/page-sections/CatalogBrowseLinked'
import {CatalogPuzzleIntroFit} from '@/components/page-sections/CatalogPuzzleIntroFit'
import {DEFAULT_CATALOG_BROWSE_QUERY} from '@/lib/catalog/catalog-browse-defaults'
import styles from './websiteDbCatalog.module.css'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Props = {
  section: WebsiteDbCatalogSection
  /** Resserre l’espacement quand un autre bandeau petit précède / suit. */
  stackedAfterSmall?: boolean
  stackedBeforeSmall?: boolean
}

function coverUrlFromSanity(image?: SanityImage | null): string | null {
  const asset = image?.asset
  if (!asset || (!asset._ref && !asset.url)) return null
  return urlForCatalogStripImage(image!).url()
}

function rowToBrowseItem(
  r: MarketingCatalogItemRow,
  coverUrl: string | null,
  extras?: Partial<
    Pick<
      MarketingCatalogGridItem,
      'displayTitle' | 'displaySubtitle' | 'objectPosition' | 'coverPosition' | 'isNew' | 'isSold' | 'status'
    >
  >,
): MarketingCatalogGridItem {
  const coverPosition =
    extras && 'coverPosition' in extras
      ? extras.coverPosition
      : (getFirstPhotoCoverMeta(r.photos)?.position ?? null)
  const {coverPosition: _coverPosInExtras, ...restExtras} = extras ?? {}
  void _coverPosInExtras
  return {
    id: r.id,
    title: r.title,
    brand_label: r.brand_label,
    category_label: r.category_label,
    color_label: r.color_label,
    size_label: r.size_label,
    size_code: r.size_code ?? null,
    price_points: r.price_points,
    item_category_id: r.item_category_id,
    item_brand_id: r.item_brand_id,
    item_couleur_id: r.item_couleur_id,
    item_size_id: r.item_size_id,
    status: r.status,
    coverUrl,
    coverPosition,
    ...restExtras,
  }
}

function CatalogSectionSkeleton({
  section,
  heading,
  intro,
  stackedAfterSmall,
  stackedBeforeSmall,
}: {
  section: WebsiteDbCatalogSection
  heading: string
  intro: string
  stackedAfterSmall?: boolean
  stackedBeforeSmall?: boolean
}) {
  return (
    <CatalogScrollStripSkeleton
      heading={heading || undefined}
      intro={intro || undefined}
      introCtaLabel={section.introCtaLabel}
      introCtaHref={section.introCtaHref}
      cardSize={section.cardSize ?? 'small'}
      stackedAfterSmall={stackedAfterSmall}
      stackedBeforeSmall={stackedBeforeSmall}
    />
  )
}

export async function SectionWebsiteDbCatalog({
  section,
  stackedAfterSmall,
  stackedBeforeSmall,
}: Props) {
  const mode = section.catalogMode === 'curated' ? 'curated' : 'full_catalog'
  const heading = section.heading?.trim() ?? ''
  const intro = section.intro?.trim() ?? ''
  const showIntro = Boolean(heading || intro || (section.introCtaLabel && section.introCtaHref))
  const supabase = getSupabaseServiceRoleClient()

  if (!supabase) {
    // Never expose config / env errors to end users — show loading frames instead.
    return (
      <CatalogSectionSkeleton
        section={section}
        heading={heading}
        intro={intro}
        stackedAfterSmall={stackedAfterSmall}
        stackedBeforeSmall={stackedBeforeSmall}
      />
    )
  }

  if (mode === 'full_catalog') {
    const payload = await loadCatalogBrowse(DEFAULT_CATALOG_BROWSE_QUERY)

    if (!payload || payload.total === 0) {
      return (
        <CatalogSectionSkeleton
          section={section}
          heading={heading}
          intro={intro}
          stackedAfterSmall={stackedAfterSmall}
          stackedBeforeSmall={stackedBeforeSmall}
        />
      )
    }

    return (
      <section className={styles.section} aria-labelledby={heading ? `db-catalog-${section._key}` : undefined}>
        {showIntro ? (
          <header>
            <CatalogPuzzleIntroFit
              heading={heading || undefined}
              lead={intro || undefined}
              introCtaLabel={section.introCtaLabel}
              introCtaHref={section.introCtaHref}
            />
          </header>
        ) : null}
        <CatalogBrowseLinked payload={payload} />
      </section>
    )
  }

  const entries = (section.dbItems ?? []).filter((e) => e.itemId && UUID_RE.test(e.itemId.trim()))
  if (entries.length === 0) {
    return (
      <CatalogSectionSkeleton
        section={section}
        heading={heading}
        intro={intro}
        stackedAfterSmall={stackedAfterSmall}
        stackedBeforeSmall={stackedBeforeSmall}
      />
    )
  }

  const ids = entries.map((e) => e.itemId!.trim())
  // Covers dès que les rows sont là — ne pas attendre les badges « New ».
  const rows = await fetchMarketingCatalogItemsByIds(ids)
  const byId = new Map(rows.map((r) => [r.id, r]))
  const [covers, newestIds] = await Promise.all([
    resolveCoverUrlsForItems(supabase, rows),
    getMarketingCatalogNewestIdSet(),
  ])

  const browseItems: MarketingCatalogGridItem[] = []
  for (const entry of entries) {
    const id = entry.itemId!.trim()
    const row = byId.get(id)
    if (!row) continue

    const editorialCover = coverUrlFromSanity(entry.coverImage)
    const dbCover = covers.get(id) ?? null
    const coverUrl = editorialCover ?? dbCover
    const objectPosition = objectPositionFromHotspot(entry.coverImage?.hotspot)
    const displayTitle = entry.cardTitle?.trim() || undefined
    const displaySubtitle = entry.cardSubtitle?.trim() || undefined
    const photoMeta = getFirstPhotoCoverMeta(row.photos)
    const badges = resolveCatalogCardBadges(row, newestIds)

    browseItems.push(
      rowToBrowseItem(row, coverUrl, {
        objectPosition: editorialCover ? objectPosition ?? undefined : undefined,
        coverPosition: editorialCover ? null : (photoMeta?.position ?? null),
        displayTitle,
        displaySubtitle,
        isNew: badges.isNew,
        isSold: badges.isSold,
      }),
    )
  }

  // Sanity a souvent des UUID d’un autre environnement : sans fallback la home
  // reste bloquée sur des skeletons « Chargement » (CDN ISR).
  if (browseItems.length < Math.min(entries.length, 6)) {
    const missing = entries.length - browseItems.length
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development') {
      console.warn(
        `[website-db-catalog] curated miss: ${browseItems.length}/${entries.length} rows for «${heading || section._key}» — fallback catalogue`,
      )
    }
    const have = new Set(browseItems.map((item) => item.id))
    const fallbackNeed = Math.max(missing, browseItems.length === 0 ? Math.min(entries.length, 12) : missing)
    const fallbackRows = (await fetchMarketingCatalogItemsFull(fallbackNeed + have.size))
      .filter((row) => !have.has(row.id))
      .slice(0, fallbackNeed)
    if (fallbackRows.length > 0) {
      const fallbackCovers = await resolveCoverUrlsForItems(supabase, fallbackRows)
      for (const row of fallbackRows) {
        const badges = resolveCatalogCardBadges(row, newestIds)
        browseItems.push(
          rowToBrowseItem(row, fallbackCovers.get(row.id) ?? null, {
            coverPosition: getFirstPhotoCoverMeta(row.photos)?.position ?? null,
            isNew: badges.isNew,
            isSold: badges.isSold,
          }),
        )
      }
    }
  }

  if (browseItems.length === 0) {
    // Pas de faux loader : section absente plutôt que skeletons figés.
    return null
  }

  return (
    <CatalogScrollStrip
      items={browseItems}
      heading={heading || undefined}
      intro={intro || undefined}
      introCtaLabel={section.introCtaLabel}
      introCtaHref={section.introCtaHref}
      cardSize={section.cardSize ?? 'small'}
      sectionKey={section._key}
      scrollMotion={section.scrollMotion}
      scrollDirection={section.scrollDirection}
      scrollSpeed={section.scrollSpeed}
      stackedAfterSmall={stackedAfterSmall}
      stackedBeforeSmall={stackedBeforeSmall}
    />
  )
}

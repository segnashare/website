import type {SanityImage} from '@/lib/sanity'
import {urlForCatalogPuzzleImage} from '@/lib/sanity'
import type {WebsiteDbCatalogSection} from '@/lib/sanity'
import type {MarketingCatalogGridItem, MarketingCatalogItemRow} from '@/lib/catalog/marketing-catalog-items'
import {getFirstPhotoCoverMeta} from '@/lib/catalog/item-photos'
import {fetchMarketingCatalogItemsByIds, gridItemsFromRows, resolveCoverUrlsForItems} from '@/lib/catalog/marketing-catalog-items'
import {loadCatalogBrowseFromPath} from '@/lib/catalog/catalog-page-loader'
import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'
import {objectPositionFromHotspot} from '@/lib/homeStagedPlacements'
import {CatalogScrollStrip} from '@/components/catalog/CatalogScrollStrip'
import {CatalogBrowseLinked} from '@/components/page-sections/CatalogBrowseLinked'
import {CatalogPuzzleIntroFit} from '@/components/page-sections/CatalogPuzzleIntroFit'
import {DEFAULT_CATALOG_BROWSE_QUERY} from '@/lib/catalog/catalog-browse-defaults'
import styles from './websiteDbCatalog.module.css'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Props = {
  section: WebsiteDbCatalogSection
}

function coverUrlFromSanity(image?: SanityImage | null): string | null {
  const asset = image?.asset
  if (!asset || (!asset._ref && !asset.url)) return null
  return urlForCatalogPuzzleImage(image!).url()
}

function rowToBrowseItem(
  r: MarketingCatalogItemRow,
  coverUrl: string | null,
  extras?: Partial<
    Pick<MarketingCatalogGridItem, 'displayTitle' | 'displaySubtitle' | 'objectPosition' | 'coverPosition'>
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
    coverUrl,
    coverPosition,
    ...restExtras,
  }
}

export async function SectionWebsiteDbCatalog({section}: Props) {
  const mode = section.catalogMode === 'curated' ? 'curated' : 'full_catalog'
  const heading = section.heading?.trim() ?? ''
  const intro = section.intro?.trim() ?? ''
  const showIntro = Boolean(heading || intro || (section.introCtaLabel && section.introCtaHref))
  const supabase = getSupabaseServiceRoleClient()
  const missingEnv = !supabase && process.env.NODE_ENV === 'development'

  if (!supabase) {
    return (
      <section className={styles.section}>
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
        {missingEnv ? (
          <p className={styles.note}>
            Variables <code>NEXT_PUBLIC_SUPABASE_URL</code> et une clé serveur (
            <code>SUPABASE_SERVICE_ROLE_KEY</code> ou <code>SUPABASE_SECRET_KEY</code>) manquantes : le catalogue Segna
            ne peut pas se charger.
          </p>
        ) : (
          <p className={styles.note}>Configuration Supabase manquante sur ce déploiement.</p>
        )}
      </section>
    )
  }

  if (mode === 'full_catalog') {
    const payload = await loadCatalogBrowseFromPath({kind: 'all'}, DEFAULT_CATALOG_BROWSE_QUERY)

    if (!payload) {
      return (
        <section className={styles.section}>
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
          <p className={styles.note}>
            Impossible de charger les facettes catalogue. Vérifiez la migration{' '}
            <code>get_marketing_website_catalog_facets</code> et la configuration Supabase.
          </p>
        </section>
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
        {payload.total === 0 ? (
          <p className={styles.note}>
            Aucune pièce catalogue pour le moment. Vérifiez les migrations SQL{' '}
            <code>get_marketing_website_catalog_items_page</code> et les pièces éligibles dans la base.
          </p>
        ) : (
          <CatalogBrowseLinked payload={payload} />
        )}
      </section>
    )
  }

  const entries = (section.dbItems ?? []).filter((e) => e.itemId && UUID_RE.test(e.itemId.trim()))
  if (entries.length === 0) {
    return (
      <section className={styles.section}>
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
        <p className={styles.note}>
          Mode « Sélection » : ajoutez au moins une pièce (UUID) dans Studio, ou passez le bloc en « Catalogue complet ».
        </p>
      </section>
    )
  }

  const ids = entries.map((e) => e.itemId!.trim())
  const rows = await fetchMarketingCatalogItemsByIds(ids)
  const byId = new Map(rows.map((r) => [r.id, r]))
  const covers = await resolveCoverUrlsForItems(supabase, rows)

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

    browseItems.push(
      rowToBrowseItem(row, coverUrl, {
        objectPosition: editorialCover ? objectPosition ?? undefined : undefined,
        coverPosition: editorialCover ? null : (photoMeta?.position ?? null),
        displayTitle,
        displaySubtitle,
      }),
    )
  }

  if (browseItems.length === 0) {
    return (
      <section className={styles.section}>
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
        <p className={styles.note}>
          Aucune pièce affichable (UUID invalide ou pièce non éligible au catalogue public).
        </p>
      </section>
    )
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
    />
  )
}

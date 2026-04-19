import type {Metadata} from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {
  fetchMarketingCatalogItemsByIds,
  resolveItemGallerySignedUrls,
} from '@/lib/catalog/marketing-catalog-items'
import {getSupabaseServiceRoleClient} from '@/lib/supabase/service-role-client'
import styles from './catalogPieceDetail.module.css'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type PageProps = {
  params: Promise<{itemId: string}>
}

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
  const {itemId} = await params
  if (!UUID_RE.test(itemId)) return {title: 'Pièce | Segna'}
  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) return {title: 'Pièce | Segna'}
  const rows = await fetchMarketingCatalogItemsByIds([itemId])
  const row = rows[0]
  if (!row) return {title: 'Pièce | Segna'}
  return {
    title: `${row.title} | Segna`,
    description: row.description?.trim() || row.brand_label || undefined,
  }
}

export default async function CatalogPieceDetailPage({params}: PageProps) {
  const {itemId} = await params
  if (!UUID_RE.test(itemId)) notFound()

  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) notFound()

  const rows = await fetchMarketingCatalogItemsByIds([itemId])
  const row = rows[0]
  if (!row) notFound()

  const gallery = await resolveItemGallerySignedUrls(supabase, row.photos)

  const fields: {label: string; value: string | null | undefined}[] = [
    {label: 'Marque', value: row.brand_label},
    {label: 'Catégorie', value: row.category_label},
    {label: 'Taille', value: row.size_label},
    {label: 'Couleur', value: row.color_label},
    {label: 'Matières', value: row.materials_label},
    {label: 'État', value: row.condition_label},
    {label: 'Prix (points)', value: row.price_points != null ? String(row.price_points) : null},
    {label: 'Statut catalogue', value: row.status},
  ]

  return (
    <main className={styles.wrap}>
      <Link href="/catalogue" className={styles.back}>
        ← Catalogue
      </Link>
      <h1 className={styles.title}>{row.title}</h1>
      <p className={styles.meta}>
        {[row.brand_label, row.category_label].filter(Boolean).join(' · ') || 'Pièce Segna'}
      </p>

      {gallery.length > 0 ? (
        <div className={styles.gallery}>
          {gallery.map((src, i) => (
            <div key={`${src}-${i}`} className={styles.galleryCell}>
              <Image
                src={src}
                alt={`${row.title} — photo ${i + 1}`}
                fill
                sizes="(max-width: 640px) 45vw, 220px"
                quality={90}
                className={styles.galleryImage}
                priority={i === 0}
              />
            </div>
          ))}
        </div>
      ) : null}

      {row.description?.trim() ? <p className={styles.description}>{row.description.trim()}</p> : null}

      <dl className={styles.dl}>
        {fields
          .filter((f) => f.value != null && String(f.value).trim() !== '')
          .map((f) => (
            <FragmentRow key={f.label} label={f.label} value={String(f.value)} />
          ))}
      </dl>
    </main>
  )
}

function FragmentRow({label, value}: {label: string; value: string}) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  )
}

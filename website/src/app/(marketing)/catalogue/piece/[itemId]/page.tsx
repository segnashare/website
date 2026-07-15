import {CatalogItemDetailView} from '@/components/catalog/CatalogItemDetailView'
import {CatalogItemRecommendedSection} from '@/components/catalog/CatalogItemRecommendedSection'
import {loadCatalogItemDetail} from '@/lib/catalog/catalog-item-detail'
import {loadCatalogItemRecommended} from '@/lib/catalog/catalog-item-recommended'
import {loadCatalogItemStyleLooks} from '@/lib/catalog/catalog-item-style-looks'
import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import styles from './piecePage.module.css'

export const revalidate = 3600

type Props = {params: Promise<{itemId: string}>}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {itemId} = await params
  const detail = await loadCatalogItemDetail(itemId)
  if (!detail) return {title: 'Pièce | Segna'}
  const title = detail.brand_label ? `${detail.title} — ${detail.brand_label}` : detail.title
  return {
    title: `${title} | Segna`,
    description: detail.description?.trim() || undefined,
  }
}

export default async function CataloguePiecePage({params}: Props) {
  const {itemId} = await params
  if (!itemId?.trim()) notFound()

  const id = itemId.trim()
  const detail = await loadCatalogItemDetail(id)
  if (!detail) notFound()

  const [looks, recommended] = await Promise.all([
    loadCatalogItemStyleLooks(id),
    loadCatalogItemRecommended({
      excludeItemId: id,
      categoryId: detail.item_category_id,
      sizeId: detail.item_size_id,
    }),
  ])

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <CatalogItemDetailView detail={detail} layout="page" looks={looks} />
      </div>
      <CatalogItemRecommendedSection items={recommended} />
    </main>
  )
}

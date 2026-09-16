import {CatalogItemDetailView} from '@/components/catalog/CatalogItemDetailView'
import {CatalogItemLooksSection} from '@/components/catalog/CatalogItemLooksSection'
import {
  CatalogItemRecommendedFallback,
  CatalogItemRecommendedSection,
} from '@/components/catalog/CatalogItemRecommendedSection'
import {loadCatalogItemDetail} from '@/lib/catalog/catalog-item-detail'
import {loadCatalogItemRecommended} from '@/lib/catalog/catalog-item-recommended'
import {loadCatalogItemStyleLooks} from '@/lib/catalog/catalog-item-style-looks'
import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {Suspense} from 'react'
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

async function PieceLooksSlot({itemId}: {itemId: string}) {
  const looks = await loadCatalogItemStyleLooks(itemId)
  if (looks.length === 0) return null
  return <CatalogItemLooksSection looks={looks} />
}

async function PieceRecommendedSlot({
  itemId,
  sizeId,
  sizeLabel,
  sizeCode,
}: {
  itemId: string
  sizeId: string | null
  sizeLabel: string | null
  sizeCode: string | null
}) {
  const recommended = await loadCatalogItemRecommended({
    excludeItemId: itemId,
    sizeId,
    sizeLabel,
    sizeCode,
  })
  return <CatalogItemRecommendedSection items={recommended} />
}

export default async function CataloguePiecePage({params}: Props) {
  const {itemId} = await params
  if (!itemId?.trim()) notFound()

  const id = itemId.trim()
  const detail = await loadCatalogItemDetail(id)
  if (!detail) notFound()

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <CatalogItemDetailView
          detail={detail}
          layout="page"
          looksSlot={
            <Suspense fallback={null}>
              <PieceLooksSlot itemId={id} />
            </Suspense>
          }
        />
      </div>
      <Suspense fallback={<CatalogItemRecommendedFallback />}>
        <PieceRecommendedSlot
          itemId={id}
          sizeId={detail.item_size_id}
          sizeLabel={detail.size_label}
          sizeCode={detail.size_code}
        />
      </Suspense>
    </main>
  )
}

import type {Metadata} from 'next'
import {CatalogViewTracker} from '@/components/analytics/CatalogViewTracker'
import {CatalogBrowseLinked} from '@/components/page-sections/CatalogBrowseLinked'
import {DEFAULT_CATALOG_BROWSE_QUERY} from '@/lib/catalog/catalog-browse-defaults'
import {loadCatalogBrowse} from '@/lib/catalog/catalog-page-loader'
import {getCatalogueMarketingShell} from '@/lib/catalog/catalogue-marketing-shell'
import {urlFor} from '@/lib/sanity'

/** Aligné sur `CATALOG_ISR_REVALIDATE_SEC` — coverUrl signées embarquées. */
export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const shell = await getCatalogueMarketingShell()
  const share = shell.seo?.shareImage
  const ogImage =
    share?.asset && (share.asset._ref || share.asset.url)
      ? urlFor(share).width(1200).height(630).fit('crop').url()
      : undefined
  return {
    title: `${shell.title} | Segna`,
    description: shell.description,
    openGraph: ogImage ? {images: [{url: ogImage}]} : undefined,
  }
}

export default async function CatalogueRootPage() {
  const [payload, shell] = await Promise.all([
    loadCatalogBrowse(DEFAULT_CATALOG_BROWSE_QUERY),
    getCatalogueMarketingShell(),
  ])

  if (!payload) {
    return (
      <div className="container" style={{paddingBlock: '2rem'}}>
        <p style={{color: '#6b6560'}}>
          Configuration Supabase manquante ou facettes indisponibles : le catalogue ne peut pas se charger.
        </p>
      </div>
    )
  }

  return (
    <>
      <CatalogViewTracker source="catalogue" />
      <CatalogBrowseLinked payload={payload} targetingLooks={shell.targetingLooks} />
    </>
  )
}

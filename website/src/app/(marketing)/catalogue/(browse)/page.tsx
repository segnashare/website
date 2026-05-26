import type {Metadata} from 'next'
import {CatalogBrowseLinked} from '@/components/page-sections/CatalogBrowseLinked'
import {loadCatalogBrowseFromPath} from '@/lib/catalog/catalog-page-loader'
import {parseCatalogBrowseQueryFromNext} from '@/lib/catalog/catalog-search-params'
import {getMarketingPageBySlug, urlFor} from '@/lib/sanity'

export const revalidate = 3600

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getMarketingPageBySlug('catalogue')
  if (!page) return {title: 'Catalogue | Segna'}
  const title = page.seo?.metaTitle?.trim() || page.heroTitle
  const description = page.seo?.metaDescription?.trim() || page.heroSubtitle?.trim() || undefined
  const share = page.seo?.shareImage
  const ogImage =
    share?.asset && (share.asset._ref || share.asset.url)
      ? urlFor(share).width(1200).height(630).fit('crop').url()
      : undefined
  return {
    title: `${title} | Segna`,
    description,
    openGraph: ogImage ? {images: [{url: ogImage}]} : undefined,
  }
}

export default async function CatalogueRootPage({searchParams}: PageProps) {
  const raw = await searchParams
  const query = parseCatalogBrowseQueryFromNext(raw)
  const payload = await loadCatalogBrowseFromPath({kind: 'all'}, query)

  if (!payload) {
    return (
      <div className="container" style={{paddingBlock: '2rem'}}>
        <p style={{color: '#6b6560'}}>
          Configuration Supabase manquante ou facettes indisponibles : le catalogue ne peut pas se charger.
        </p>
      </div>
    )
  }

  return <CatalogBrowseLinked payload={payload} />
}

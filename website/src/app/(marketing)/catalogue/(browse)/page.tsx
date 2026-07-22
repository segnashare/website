import type {Metadata} from 'next'
import {CatalogBrowseLinked} from '@/components/page-sections/CatalogBrowseLinked'
import {DEFAULT_CATALOG_BROWSE_QUERY} from '@/lib/catalog/catalog-browse-defaults'
import {loadCatalogBrowse} from '@/lib/catalog/catalog-page-loader'
import {heroTitlePlainText} from '@/lib/hero-title'
import {getMarketingPageBySlug, urlFor} from '@/lib/sanity'

/** Aligné sur `CATALOG_ISR_REVALIDATE_SEC` — coverUrl signées embarquées. */
export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const page = await getMarketingPageBySlug('catalogue')
  if (!page) return {title: 'Catalogue | Segna'}
  const title = page.seo?.metaTitle?.trim() || heroTitlePlainText(page.heroTitle)
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

export default async function CatalogueRootPage() {
  const payload = await loadCatalogBrowse(DEFAULT_CATALOG_BROWSE_QUERY)

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

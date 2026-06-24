import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {CatalogBrandEditorial} from '@/components/catalog/CatalogBrandEditorial'
import {CatalogBrowseLinked} from '@/components/page-sections/CatalogBrowseLinked'
import {DEFAULT_CATALOG_BROWSE_QUERY} from '@/lib/catalog/catalog-browse-defaults'
import {getBrandEditorialForCatalogPayload} from '@/lib/catalog/catalog-brand-editorial-for-payload'
import {loadCatalogBrowseFromPath} from '@/lib/catalog/catalog-page-loader'
import {categoryBySlug} from '@/lib/catalog/catalog-category-tree'
import {fetchMarketingCatalogPathResolveNav} from '@/lib/catalog/marketing-catalog-items'

export const revalidate = 86400

type PageProps = {
  params: Promise<{segment: string}>
}

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
  const {segment} = await params
  const facets = await fetchMarketingCatalogPathResolveNav()
  if (!facets) return {title: 'Catalogue | Segna'}
  const b = facets.brands.find((x) => x.slug === segment.toLowerCase())
  if (b) return {title: `${b.label} | Catalogue Segna`}
  const c = categoryBySlug(facets.categories, segment)
  if (c) return {title: `${c.label} | Catalogue Segna`}
  return {title: 'Catalogue | Segna'}
}

export default async function CatalogueSegmentPage({params}: PageProps) {
  const {segment} = await params

  const payload = await loadCatalogBrowseFromPath({kind: 'one', segment}, DEFAULT_CATALOG_BROWSE_QUERY)
  if (!payload) notFound()

  const brandBlock = await getBrandEditorialForCatalogPayload(payload)

  return (
    <CatalogBrowseLinked
      payload={payload}
      brandBand={
        brandBlock ? (
          <CatalogBrandEditorial
            headline={brandBlock.editorial.headline}
            description={brandBlock.editorial.description}
            fallbackBrandLabel={brandBlock.fallbackBrandLabel}
          />
        ) : undefined
      }
    />
  )
}

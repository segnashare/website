import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {CatalogBrandEditorial} from '@/components/catalog/CatalogBrandEditorial'
import {CatalogBrowseLinked} from '@/components/page-sections/CatalogBrowseLinked'
import {getBrandEditorialForCatalogPayload} from '@/lib/catalog/catalog-brand-editorial-for-payload'
import {loadCatalogBrowseFromPath} from '@/lib/catalog/catalog-page-loader'
import {parseCatalogBrowseQueryFromNext} from '@/lib/catalog/catalog-search-params'
import {categoryBySlug} from '@/lib/catalog/catalog-category-tree'
import {fetchMarketingCatalogFacetsNav} from '@/lib/catalog/marketing-catalog-items'

export const revalidate = 30

type PageProps = {
  params: Promise<{segment: string}>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
  const {segment} = await params
  const facets = await fetchMarketingCatalogFacetsNav()
  if (!facets) return {title: 'Catalogue | Segna'}
  const b = facets.brands.find((x) => x.slug === segment.toLowerCase())
  if (b) return {title: `${b.label} | Catalogue Segna`}
  const c = categoryBySlug(facets.categories, segment)
  if (c) return {title: `${c.label} | Catalogue Segna`}
  return {title: 'Catalogue | Segna'}
}

export default async function CatalogueSegmentPage({params, searchParams}: PageProps) {
  const {segment} = await params
  const raw = await searchParams
  const query = parseCatalogBrowseQueryFromNext(raw)

  const payload = await loadCatalogBrowseFromPath({kind: 'one', segment}, query)
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

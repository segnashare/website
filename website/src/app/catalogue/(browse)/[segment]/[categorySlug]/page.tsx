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
  params: Promise<{segment: string; categorySlug: string}>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
  const {segment, categorySlug} = await params
  const facets = await fetchMarketingCatalogFacetsNav()
  if (!facets) return {title: 'Catalogue | Segna'}
  const b = facets.brands.find((x) => x.slug === segment.toLowerCase())
  const c = categoryBySlug(facets.categories, categorySlug)
  if (b && c) return {title: `${b.label} — ${c.label} | Catalogue Segna`}
  const p = categoryBySlug(facets.categories, segment)
  const ch = categoryBySlug(facets.categories, categorySlug)
  if (p && p.parentId == null && ch && ch.parentId === p.id) {
    return {title: `${p.label} — ${ch.label} | Catalogue Segna`}
  }
  return {title: 'Catalogue | Segna'}
}

export default async function CatalogueBrandCategoryPage({params, searchParams}: PageProps) {
  const {segment, categorySlug} = await params
  const raw = await searchParams
  const query = parseCatalogBrowseQueryFromNext(raw)

  const payload = await loadCatalogBrowseFromPath({kind: 'pair', brandSlug: segment, categorySlug}, query)
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

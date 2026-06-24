import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {CatalogBrandEditorial} from '@/components/catalog/CatalogBrandEditorial'
import {CatalogBrowseLinked} from '@/components/page-sections/CatalogBrowseLinked'
import {DEFAULT_CATALOG_BROWSE_QUERY} from '@/lib/catalog/catalog-browse-defaults'
import {getBrandEditorialForCatalogPayload} from '@/lib/catalog/catalog-brand-editorial-for-payload'
import {loadCatalogBrowseFromPath} from '@/lib/catalog/catalog-page-loader'
import {categoryBySlug} from '@/lib/catalog/catalog-category-tree'
import {resolveCatalogIntersection} from '@/lib/catalog/catalog-path-resolve'
import {fetchMarketingCatalogPathResolveNav} from '@/lib/catalog/marketing-catalog-items'

export const revalidate = 86400

type PageProps = {
  params: Promise<{segment: string; categorySlug: string}>
}

export async function generateStaticParams() {
  const nav = await fetchMarketingCatalogPathResolveNav()
  if (!nav) return []
  const out: {segment: string; categorySlug: string}[] = []
  const seen = new Set<string>()
  for (const b of nav.brands) {
    for (const c of nav.categories) {
      const resolved = resolveCatalogIntersection(nav, b.slug, c.slug)
      if (resolved?.kind !== 'intersection') continue
      const key = `${b.slug}/${c.slug}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({segment: b.slug, categorySlug: c.slug})
    }
  }
  for (const p of nav.categories) {
    if (p.parentId != null) continue
    for (const ch of nav.categories) {
      if (ch.parentId === p.id) out.push({segment: p.slug, categorySlug: ch.slug})
    }
  }
  return out
}

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
  const {segment, categorySlug} = await params
  const facets = await fetchMarketingCatalogPathResolveNav()
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

export default async function CatalogueBrandCategoryPage({params}: PageProps) {
  const {segment, categorySlug} = await params

  const payload = await loadCatalogBrowseFromPath(
    {kind: 'pair', brandSlug: segment, categorySlug},
    DEFAULT_CATALOG_BROWSE_QUERY,
  )
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

import type {CatalogBrowsePayload} from '@/lib/catalog/catalog-page-loader'
import {getCatalogBrandEditorialBySlug} from '@/lib/sanity'

export type BrandEditorialForPayload = {
  editorial: NonNullable<Awaited<ReturnType<typeof getCatalogBrandEditorialBySlug>>>
  fallbackBrandLabel: string | null
}

export async function getBrandEditorialForCatalogPayload(
  payload: CatalogBrowsePayload,
): Promise<BrandEditorialForPayload | null> {
  if (payload.resolved.kind !== 'brand' && payload.resolved.kind !== 'intersection') {
    return null
  }
  const slug = payload.resolved.brandSlug
  const editorial = await getCatalogBrandEditorialBySlug(slug)
  if (!editorial) return null
  const hasBody = Array.isArray(editorial.description) && editorial.description.length > 0
  const hasHeadline = Boolean(editorial.headline?.trim())
  if (!hasBody && !hasHeadline) return null

  const fallbackBrandLabel = payload.facets.brands.find((b) => b.slug === slug)?.label ?? null
  return {editorial, fallbackBrandLabel}
}

export type CategoryPathSegments =
  | {shape: 'single'; slug: string}
  | {shape: 'parent_child'; parentSlug: string; childSlug: string}

export type CatalogPathResolved =
  | {kind: 'all'}
  | {kind: 'brand'; brandSlug: string; brandId: string}
  | {
      kind: 'category'
      segments: CategoryPathSegments
      categoryFilterIds: string[]
    }
  | {
      kind: 'intersection'
      brandSlug: string
      brandId: string
      categorySlug: string
      categoryFilterIds: string[]
    }

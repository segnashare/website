import type {CatalogBrowsePayload} from '@/lib/catalog/catalog-page-loader'
import type {CollectionTargetingLookView} from '@/lib/catalog/catalog-collection-looks'
import {CatalogBrowseInteractive} from './CatalogBrowseInteractive'

export function CatalogBrowseLinked({
  payload,
  targetingLooks = [],
}: {
  payload: CatalogBrowsePayload
  targetingLooks?: CollectionTargetingLookView[]
}) {
  return <CatalogBrowseInteractive payload={payload} targetingLooks={targetingLooks} />
}

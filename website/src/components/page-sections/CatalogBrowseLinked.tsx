import type {CatalogBrowsePayload} from '@/lib/catalog/catalog-page-loader'
import {CatalogBrowseInteractive} from './CatalogBrowseInteractive'

export function CatalogBrowseLinked({payload}: {payload: CatalogBrowsePayload}) {
  return <CatalogBrowseInteractive payload={payload} />
}

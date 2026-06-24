import type {CatalogBrowsePayload} from '@/lib/catalog/catalog-page-loader'
import type {ReactNode} from 'react'
import {CatalogBrowseInteractive} from './CatalogBrowseInteractive'

export function CatalogBrowseLinked({
  payload,
  brandBand,
}: {
  payload: CatalogBrowsePayload
  brandBand?: ReactNode
}) {
  return <CatalogBrowseInteractive payload={payload} brandBand={brandBand} />
}

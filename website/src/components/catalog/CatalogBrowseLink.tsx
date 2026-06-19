import Link from 'next/link'
import type {ComponentProps} from 'react'

/** Désactive le prefetch viewport : une page catalogue expose des dizaines de liens lourds (SSR + Supabase). */
export function CatalogBrowseLink(props: ComponentProps<typeof Link>) {
  return <Link prefetch={false} {...props} />
}

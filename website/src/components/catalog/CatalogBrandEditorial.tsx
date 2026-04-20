import type {PortableTextBlock} from '@portabletext/types'
import {PortableRichText} from '@/components/cms/PortableRichText'
import styles from './catalogBrandEditorial.module.css'

function blocksNonEmpty(value?: PortableTextBlock[] | null): boolean {
  return Array.isArray(value) && value.length > 0
}

type Props = {
  headline: string | null
  description: PortableTextBlock[] | null
  /** Si pas de titre Sanity, libellé catalogue (base Segna). */
  fallbackBrandLabel?: string | null
}

export function CatalogBrandEditorial({headline, description, fallbackBrandLabel}: Props) {
  const title = headline?.trim() || fallbackBrandLabel?.trim() || null
  const hasBody = blocksNonEmpty(description)
  if (!title && !hasBody) return null

  return (
    <section className={styles.wrap} aria-label={title ?? 'Marque'}>
      {title ? <h2 className={styles.headline}>{title}</h2> : null}
      {hasBody ? <PortableRichText value={description!} className={styles.body} /> : null}
    </section>
  )
}

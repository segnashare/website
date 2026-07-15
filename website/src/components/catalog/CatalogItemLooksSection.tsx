import {SEGNA_APP_BASE_URL} from '@/lib/catalog/catalog-app-links'
import type {CatalogItemLookMedia} from '@/lib/catalog/catalog-item-style-looks'
import styles from './catalogItemLooksSection.module.css'

const MAX_LOOKS = 8

type Props = {
  looks: CatalogItemLookMedia[]
}

function thumbUrl(look: CatalogItemLookMedia): string {
  if (look.mediaType === 'video') return look.posterUrl ?? look.url
  return look.url
}

export function CatalogItemLooksSection({looks}: Props) {
  const visible = looks.slice(0, MAX_LOOKS)
  if (visible.length === 0) return null

  return (
    <section className={styles.section} aria-label="Porté dans ces looks">
      <h3 className={styles.heading}>Porté dans ces looks</h3>
      <ul className={styles.grid}>
        {visible.map((look) => {
          const href = `${SEGNA_APP_BASE_URL}/look/${encodeURIComponent(look.lookId)}`
          const src = thumbUrl(look)
          return (
            <li key={look.lookId} className={styles.cell}>
              <a href={href} className={styles.thumbLink} aria-label={look.title || 'Voir le look sur Segna'}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.thumb} src={src} alt={look.title || ''} />
                {look.mediaType === 'video' ? (
                  <span className={styles.playMark} aria-hidden>
                    ▶
                  </span>
                ) : null}
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

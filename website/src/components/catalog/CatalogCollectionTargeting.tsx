'use client'

import Image from 'next/image'
import {
  displayCollectionLookTitle,
  queryFromCollectionLook,
  selectedCollectionLook,
  type CollectionTargetingLookView,
} from '@/lib/catalog/catalog-collection-looks'
import type {CatalogBrowseQuery} from '@/lib/catalog/catalog-search-params'
import styles from './catalogCollectionTargeting.module.css'

type Props = {
  looks: CollectionTargetingLookView[]
  query: CatalogBrowseQuery
  onSelectLook: (look: CollectionTargetingLookView) => void
}

export function CatalogCollectionTargeting({looks, query, onSelectLook}: Props) {
  const selected = selectedCollectionLook(looks, query)

  if (looks.length === 0) return null

  const subtitle = selected?.subtitle?.trim()

  return (
    <section className={styles.root} aria-label="Cibler la collection">
      {selected ? (
        <header className={styles.heading}>
          <h3 className={styles.title}>{displayCollectionLookTitle(selected.title)}</h3>
          {subtitle ? (
            <p className={styles.subtitle} key={selected.slug}>
              {subtitle}
            </p>
          ) : null}
        </header>
      ) : null}

      <div className={styles.stage}>
        <div className={styles.mosaic} role="tablist" aria-label="Looks de la collection">
          {looks.map((look) => {
            const active = selected?.slug === look.slug
            return (
              <button
                key={look.key}
                type="button"
                role="tab"
                aria-selected={active}
                className={`${styles.card} ${active ? styles.cardActive : ''}`}
                onClick={() => onSelectLook(look)}
              >
                <span className={styles.photo}>
                  {look.imageUrl ? (
                    <Image
                      src={look.imageUrl}
                      alt={look.imageAlt || displayCollectionLookTitle(look.title)}
                      fill
                      sizes="(max-width: 48rem) 29vw, 25vw"
                      className={styles.photoImg}
                      style={look.objectPosition ? {objectPosition: look.objectPosition} : undefined}
                    />
                  ) : (
                    <span className={styles.photoFallback} aria-hidden />
                  )}
                </span>
                <span className={styles.label}>{displayCollectionLookTitle(look.title)}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function applyLookFromTargeting(
  look: CollectionTargetingLookView,
  query: CatalogBrowseQuery,
): CatalogBrowseQuery {
  return queryFromCollectionLook(look, query.sort)
}

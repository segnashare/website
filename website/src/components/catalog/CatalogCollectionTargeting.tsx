'use client'

import Image from 'next/image'
import {useEffect, useRef} from 'react'
import {
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
  const trackRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!selected) return
    const track = trackRef.current
    if (!track) return
    const node = track.querySelector<HTMLElement>(`[data-look="${selected.slug}"]`)
    if (!node) return
    const left = node.offsetLeft - track.clientWidth / 2 + node.offsetWidth / 2
    track.scrollTo({left: Math.max(0, left), behavior: 'smooth'})
  }, [selected?.slug])

  if (looks.length === 0) return null

  const subtitle = selected?.subtitle?.trim()

  return (
    <section className={styles.root} aria-label="Cibler la collection">
      <div className={styles.frame} ref={trackRef}>
        {looks.map((look) => {
          const active = selected?.slug === look.slug
          return (
            <button
              key={look.key}
              type="button"
              data-look={look.slug}
              className={`${styles.card} ${active ? styles.cardActive : ''}`}
              aria-pressed={active}
              aria-label={look.title}
              onClick={() => onSelectLook(look)}
            >
              <span className={styles.photo}>
                {look.imageUrl ? (
                  <Image
                    src={look.imageUrl}
                    alt={look.imageAlt || look.title}
                    fill
                    sizes="(max-width: 768px) 42vw, 220px"
                    className={styles.photoImg}
                    style={look.objectPosition ? {objectPosition: look.objectPosition} : undefined}
                  />
                ) : (
                  <span className={styles.photoFallback} aria-hidden />
                )}
              </span>
            </button>
          )
        })}
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Filtres de ciblage">
        {looks.map((look) => {
          const active = selected?.slug === look.slug
          return (
            <button
              key={`tab-${look.key}`}
              type="button"
              role="tab"
              aria-selected={active}
              className={`${styles.tab} ${active ? styles.tabActive : ''}`}
              onClick={() => onSelectLook(look)}
            >
              {look.title}
            </button>
          )
        })}
      </div>

      {subtitle ? (
        <p className={styles.subtitle} key={selected?.slug}>
          {subtitle}
        </p>
      ) : (
        <div className={styles.subtitleSlot} aria-hidden />
      )}
    </section>
  )
}

export function applyLookFromTargeting(
  look: CollectionTargetingLookView,
  query: CatalogBrowseQuery,
): CatalogBrowseQuery {
  return queryFromCollectionLook(look, query.sort)
}

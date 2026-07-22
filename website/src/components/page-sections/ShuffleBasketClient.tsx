'use client'

import {useEffect, useMemo, useState, useTransition} from 'react'
import Link from 'next/link'
import {CatalogGridCardMedia} from '@/components/catalog/CatalogGridCardMedia'
import {catalogItemPagePath} from '@/lib/catalog/catalog-app-links'
import {formatCatalogPurchasePriceShort} from '@/lib/catalog/catalog-borrow-price-label'
import type {MarketingCatalogGridItem} from '@/lib/catalog/marketing-catalog-items'
import {
  drawShuffleBasket,
  shuffleBasketTotalEuro,
  SHUFFLE_BASKET_BUDGET_EURO,
  SHUFFLE_BASKET_MAX_ITEMS,
  SHUFFLE_BASKET_MAX_ITEMS_MOBILE,
  type ShuffleBasketItem,
} from '@/lib/catalog/shuffle-basket'
import styles from './shuffleBasket.module.css'

type Props = {
  heading?: string | null
  intro?: string | null
  ctaLabel?: string | null
}

const MOBILE_MQ = '(max-width: 719px)'

function useShuffleMaxItems(): number {
  const [maxItems, setMaxItems] = useState(() => {
    if (typeof window === 'undefined') return SHUFFLE_BASKET_MAX_ITEMS
    return window.matchMedia(MOBILE_MQ).matches
      ? SHUFFLE_BASKET_MAX_ITEMS_MOBILE
      : SHUFFLE_BASKET_MAX_ITEMS
  })

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const sync = () => {
      setMaxItems(mq.matches ? SHUFFLE_BASKET_MAX_ITEMS_MOBILE : SHUFFLE_BASKET_MAX_ITEMS)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return maxItems
}

function MediaSkeleton() {
  return <div className={styles.mediaSkeleton} aria-hidden />
}

export function ShuffleBasketClient({heading, intro, ctaLabel}: Props) {
  const maxItems = useShuffleMaxItems()
  const [pool, setPool] = useState<MarketingCatalogGridItem[]>([])
  const [basket, setBasket] = useState<ShuffleBasketItem[]>([])
  const [previousCount, setPreviousCount] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // 2 pages pour élargir le pool (sacs / chaussures / accessoires souvent hors top 60 récents).
        const pages = await Promise.all([
          fetch('/api/marketing/catalog?limit=60&sort=recent&page=1', {credentials: 'same-origin'}),
          fetch('/api/marketing/catalog?limit=60&sort=recent&page=2', {credentials: 'same-origin'}),
        ])
        const merged = new Map<string, MarketingCatalogGridItem>()
        for (const res of pages) {
          if (!res.ok) continue
          const data = (await res.json()) as {items?: MarketingCatalogGridItem[]}
          for (const item of data.items ?? []) {
            if (item.isSold) continue
            merged.set(item.id, item)
          }
        }
        const items = [...merged.values()]
        if (cancelled) return
        setPool(items)
        setReady(true)
      } catch {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready || pool.length === 0) return
    const next = drawShuffleBasket(pool, {
      previousCount,
      maxItems,
    })
    setBasket(next)
    setPreviousCount(next.length || null)
    // previousCount volontairement omis : on ne redessine que quand le plafond change / pool prêt
    // eslint-disable-next-line react-hooks/exhaustive-deps -- plafond mobile/desktop
  }, [ready, pool, maxItems])

  const total = useMemo(() => shuffleBasketTotalEuro(basket), [basket])
  const headingText = heading?.trim() || ''
  const label = ctaLabel?.trim() || 'Shuffle mon panier'

  const reshuffle = () => {
    if (!ready || pool.length === 0) return
    startTransition(() => {
      const next = drawShuffleBasket(pool, {
        previousCount: basket.length || previousCount,
        maxItems,
      })
      setPreviousCount(next.length || basket.length)
      setBasket(next)
    })
  }

  return (
    <section
      className={styles.band}
      aria-label={headingText || 'Compose ton panier'}
      {...(headingText ? {'aria-labelledby': 'shuffle-basket-heading'} : {})}
    >
      <div className={styles.inner}>
        {headingText || intro?.trim() ? (
          <header className={styles.header}>
            {headingText ? (
              <h2 id="shuffle-basket-heading" className={styles.heading}>
                {headingText}
              </h2>
            ) : null}
            {intro?.trim() ? <p className={styles.intro}>{intro.trim()}</p> : null}
          </header>
        ) : null}

        <ul className={styles.grid} data-count={maxItems} aria-busy={!ready || pending || undefined}>
          {!ready
            ? Array.from({length: maxItems}, (_, i) => (
                <li key={`sk-${i}`} className={styles.card}>
                  <div className={styles.cardLink}>
                    <div className={styles.media}>
                      <MediaSkeleton />
                    </div>
                    <div className={styles.body}>
                      <span className={styles.lineSkeleton} />
                      <span className={styles.lineSkeletonShort} />
                    </div>
                  </div>
                </li>
              ))
            : basket.length === 0
              ? (
                  <li className={styles.emptyCard}>
                    <p className={styles.empty}>Pas assez de pièces pour composer un panier — réessaie.</p>
                  </li>
                )
              : basket.map((item) => {
                  const titleLine = item.displayTitle ?? item.title
                  return (
                    <li key={item.id} className={styles.card}>
                      <Link
                        href={catalogItemPagePath(item.id)}
                        className={styles.cardLink}
                        aria-label={`Voir ${titleLine}`}
                      >
                        <div className={styles.media}>
                          {item.coverUrl ? (
                            <CatalogGridCardMedia item={item} />
                          ) : (
                            <MediaSkeleton />
                          )}
                        </div>
                        <div className={styles.body}>
                          <span className={styles.title}>{titleLine}</span>
                          <span className={styles.price}>
                            {formatCatalogPurchasePriceShort(item.price_points)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  )
                })}
        </ul>

        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.shuffleBtn}
            onClick={reshuffle}
            disabled={!ready || pending || pool.length === 0}
          >
            {pending ? 'Tirage…' : label}
          </button>
          {ready && basket.length > 0 ? (
            <p className={styles.meta} aria-live="polite">
              <span>
                {basket.length} pièce{basket.length > 1 ? 's' : ''}
              </span>
              <span className={styles.metaDot} aria-hidden>
                ·
              </span>
              <span>
                {formatCatalogPurchasePriceShort(total)} /{' '}
                {formatCatalogPurchasePriceShort(SHUFFLE_BASKET_BUDGET_EURO)}
              </span>
            </p>
          ) : (
            <p className={styles.metaPlaceholder} aria-hidden>
              &nbsp;
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

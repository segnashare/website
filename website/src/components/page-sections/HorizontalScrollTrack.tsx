'use client'

import {useEffect, useState, type CSSProperties} from 'react'
import type {
  HorizontalScrollCard as HorizontalScrollCardData,
  HorizontalScrollScrollDirection,
  HorizontalScrollScrollMotion,
  HorizontalScrollScrollSpeed,
} from '@/lib/sanity'
import {HorizontalScrollCard as HorizontalScrollCardView} from '@/components/page-sections/HorizontalScrollCard'
import styles from '@/components/page-sections/horizontalScrollCards.module.css'

type Props = {
  items: HorizontalScrollCardData[]
  scrollMotion?: HorizontalScrollScrollMotion
  scrollDirection?: HorizontalScrollScrollDirection
  scrollSpeed?: HorizontalScrollScrollSpeed
}

const SECONDS_PER_ITEM: Record<HorizontalScrollScrollSpeed, number> = {
  slow: 7,
  normal: 4.5,
  fast: 2.5,
}

function marqueeDuration(items: HorizontalScrollCardData[], speed: HorizontalScrollScrollSpeed): number {
  return Math.max(12, items.length * SECONDS_PER_ITEM[speed])
}

export function HorizontalScrollTrack({
  items,
  scrollMotion = 'manual',
  scrollDirection = 'to-left',
  scrollSpeed = 'normal',
}: Props) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setPrefersReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const useMarquee = scrollMotion === 'auto_loop' && !prefersReducedMotion && items.length > 0
  const loopItems = [...items, ...items]

  if (useMarquee) {
    const duration = marqueeDuration(items, scrollSpeed)
    const directionCls = scrollDirection === 'to-right' ? styles.marqueeToRight : styles.marqueeToLeft

    return (
      <div className={styles.marqueeViewport} aria-label="Carrousel défilant">
        <div
          className={`${styles.marqueeTrack} ${directionCls}`}
          style={{'--marquee-duration': `${duration}s`} as CSSProperties}
        >
          <div className={styles.marqueeRow}>
            {loopItems.map((card, index) => (
              <HorizontalScrollCardView key={`${card._key}-${index}`} card={card} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.track}>
      <div className={styles.trackRow}>
        {items.map((card) => (
          <HorizontalScrollCardView key={card._key} card={card} />
        ))}
      </div>
    </div>
  )
}

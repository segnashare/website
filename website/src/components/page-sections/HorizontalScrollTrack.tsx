'use client'

import {useEffect, useRef, useState, type CSSProperties} from 'react'
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

/** Détecte un geste horizontal (scroll manuel) sans couper un simple tap sur une carte. */
function isHorizontalScrollGesture(startX: number, startY: number, currentX: number, currentY: number): boolean {
  const dx = Math.abs(currentX - startX)
  const dy = Math.abs(currentY - startY)
  return dx > 10 && dx > dy * 1.15
}

function ManualTrack({items}: {items: HorizontalScrollCardData[]}) {
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

export function HorizontalScrollTrack({
  items,
  scrollMotion = 'manual',
  scrollDirection = 'to-left',
  scrollSpeed = 'normal',
}: Props) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [manualOverride, setManualOverride] = useState(false)
  const touchStartRef = useRef<{x: number; y: number} | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setPrefersReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const useMarquee =
    scrollMotion === 'auto_loop' && !prefersReducedMotion && !manualOverride && items.length > 0
  const loopItems = [...items, ...items]

  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0]
    if (!touch) return
    touchStartRef.current = {x: touch.clientX, y: touch.clientY}
  }

  const handleTouchMove = (event: React.TouchEvent) => {
    const start = touchStartRef.current
    const touch = event.touches[0]
    if (!start || !touch) return
    if (isHorizontalScrollGesture(start.x, start.y, touch.clientX, touch.clientY)) {
      setManualOverride(true)
      touchStartRef.current = null
    }
  }

  const clearTouchStart = () => {
    touchStartRef.current = null
  }

  if (!useMarquee) {
    return <ManualTrack items={items} />
  }

  const duration = marqueeDuration(items, scrollSpeed)
  const directionCls = scrollDirection === 'to-right' ? styles.marqueeToRight : styles.marqueeToLeft

  return (
    <div
      className={styles.marqueeViewport}
      aria-label="Carrousel défilant"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={clearTouchStart}
      onTouchCancel={clearTouchStart}
    >
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

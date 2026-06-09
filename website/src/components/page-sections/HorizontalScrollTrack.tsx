'use client'

import {useEffect, useRef, useState, type CSSProperties, type TouchEvent as ReactTouchEvent} from 'react'
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

function wrapOffset(offset: number, loopWidth: number): number {
  if (loopWidth <= 0) return offset
  let next = offset
  while (next > 0) next -= loopWidth
  while (next < -loopWidth) next += loopWidth
  return next
}

function readTranslateX(el: HTMLElement): number {
  const transform = window.getComputedStyle(el).transform
  if (!transform || transform === 'none') return 0
  return new DOMMatrixReadOnly(transform).m41
}

function loopProgress(
  offset: number,
  loopWidth: number,
  direction: HorizontalScrollScrollDirection,
): number {
  if (loopWidth <= 0) return 0
  const raw =
    direction === 'to-right' ? (offset + loopWidth) / loopWidth : -offset / loopWidth
  return ((raw % 1) + 1) % 1
}

function clearTrackInlineMotion(track: HTMLElement) {
  track.style.animation = ''
  track.style.animationDelay = ''
  track.style.animationPlayState = ''
  track.style.transform = ''
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

function LoopMarqueeTrack({
  items,
  scrollDirection,
  scrollSpeed,
}: {
  items: HorizontalScrollCardData[]
  scrollDirection: HorizontalScrollScrollDirection
  scrollSpeed: HorizontalScrollScrollSpeed
}) {
  const [animationDelay, setAnimationDelay] = useState('0s')
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const loopWidthRef = useRef(0)
  const offsetRef = useRef(0)
  const lastTouchXRef = useRef(0)
  const activeTouchIdRef = useRef<number | null>(null)
  const touchListenersRef = useRef<{
    move: (event: TouchEvent) => void
    end: (event: TouchEvent) => void
  } | null>(null)

  const duration = marqueeDuration(items, scrollSpeed)
  const directionCls = scrollDirection === 'to-right' ? styles.marqueeToRight : styles.marqueeToLeft

  const measureLoopWidth = () => {
    const row = rowRef.current
    if (!row) return
    const total = row.scrollWidth
    if (total > 0) loopWidthRef.current = total / 2
  }

  const applyDragTransform = () => {
    const track = trackRef.current
    if (!track) return
    track.style.animation = 'none'
    track.style.animationDelay = ''
    track.style.animationPlayState = 'paused'
    track.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`
  }

  const resumeAutoAnimation = () => {
    const track = trackRef.current
    const viewport = viewportRef.current
    if (!track) return

    viewport?.classList.remove(styles.marqueeViewportDragging)
    measureLoopWidth()

    const loopW = loopWidthRef.current
    offsetRef.current = wrapOffset(offsetRef.current, loopW)

    const progress = loopProgress(offsetRef.current, loopW, scrollDirection)
    const delay = loopW > 0 ? -(progress * duration) : 0

    clearTrackInlineMotion(track)
    void track.offsetWidth

    setAnimationDelay(`${delay}s`)
  }

  const clearTouchListeners = () => {
    const viewport = viewportRef.current
    const listeners = touchListenersRef.current
    if (!viewport || !listeners) return
    viewport.removeEventListener('touchmove', listeners.move)
    viewport.removeEventListener('touchend', listeners.end)
    viewport.removeEventListener('touchcancel', listeners.end)
    touchListenersRef.current = null
    activeTouchIdRef.current = null
  }

  useEffect(() => () => clearTouchListeners(), [])

  const beginDrag = () => {
    const track = trackRef.current
    const viewport = viewportRef.current
    if (!track || !viewport) return

    viewport.classList.add(styles.marqueeViewportDragging)
    measureLoopWidth()

    const loopW = loopWidthRef.current
    const current = loopW > 0 ? wrapOffset(readTranslateX(track), loopW) : readTranslateX(track)
    offsetRef.current = current
    applyDragTransform()
  }

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    if (!touch) return

    clearTouchListeners()
    beginDrag()
    lastTouchXRef.current = touch.clientX
    activeTouchIdRef.current = touch.identifier

    const viewport = viewportRef.current
    if (!viewport) return

    const onTouchMove = (nativeEvent: TouchEvent) => {
      const activeId = activeTouchIdRef.current
      if (activeId == null) return
      const activeTouch = Array.from(nativeEvent.touches).find((t) => t.identifier === activeId)
      if (!activeTouch) return

      if (loopWidthRef.current <= 0) measureLoopWidth()

      const dx = activeTouch.clientX - lastTouchXRef.current
      lastTouchXRef.current = activeTouch.clientX
      offsetRef.current = wrapOffset(offsetRef.current + dx, loopWidthRef.current)
      applyDragTransform()
      nativeEvent.preventDefault()
    }

    const onTouchEnd = (nativeEvent: TouchEvent) => {
      const activeId = activeTouchIdRef.current
      if (activeId == null) return
      const stillActive = Array.from(nativeEvent.touches).some((t) => t.identifier === activeId)
      if (stillActive) return
      clearTouchListeners()
      resumeAutoAnimation()
    }

    touchListenersRef.current = {move: onTouchMove, end: onTouchEnd}
    viewport.addEventListener('touchmove', onTouchMove, {passive: false})
    viewport.addEventListener('touchend', onTouchEnd)
    viewport.addEventListener('touchcancel', onTouchEnd)
  }

  const trackStyle = {
    '--marquee-duration': `${duration}s`,
    animationDelay,
  } as CSSProperties

  return (
    <div
      ref={viewportRef}
      className={styles.marqueeViewport}
      aria-label="Carrousel défilant"
      onTouchStart={handleTouchStart}
    >
      <div ref={trackRef} className={`${styles.marqueeTrack} ${directionCls}`} style={trackStyle}>
        <div ref={rowRef} className={styles.marqueeRow}>
          {items.map((card) => (
            <HorizontalScrollCardView key={card._key} card={card} eagerLoad />
          ))}
          {items.map((card) => (
            <HorizontalScrollCardView key={`clone-${card._key}`} card={card} visualClone />
          ))}
        </div>
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

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setPrefersReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const useAutoLoop = scrollMotion === 'auto_loop' && !prefersReducedMotion && items.length > 0

  if (useAutoLoop) {
    return (
      <LoopMarqueeTrack items={items} scrollDirection={scrollDirection} scrollSpeed={scrollSpeed} />
    )
  }

  return <ManualTrack items={items} />
}

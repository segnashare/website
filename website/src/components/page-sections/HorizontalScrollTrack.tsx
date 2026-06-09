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

/** Évite de basculer en drag sur les micro-mouvements du doigt. */
const DRAG_THRESHOLD_PX = 8

/** Filet de sécurité si le navigateur ne remonte pas touchend. */
const TOUCH_WATCHDOG_MS = 12_000

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
  const animationDelayRef = useRef('0s')
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const loopWidthRef = useRef(0)
  const offsetRef = useRef(0)
  const lastTouchXRef = useRef(0)
  const touchStartXRef = useRef(0)
  const activeTouchIdRef = useRef<number | null>(null)
  const touchSessionRef = useRef(0)
  const holdActiveRef = useRef(false)
  const dragActiveRef = useRef(false)
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchListenersRef = useRef<{
    move: (event: TouchEvent) => void
    end: (event: TouchEvent) => void
    pointerEnd: (event: PointerEvent) => void
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

  const restartCssAnimation = (delaySeconds: number) => {
    const track = trackRef.current
    if (!track) return

    clearTrackInlineMotion(track)
    track.style.animation = 'none'
    void track.offsetWidth
    clearTrackInlineMotion(track)
    track.style.animationDelay = `${delaySeconds}s`
    void track.offsetWidth

    const delayValue = `${delaySeconds}s`
    animationDelayRef.current = delayValue
    setAnimationDelay(delayValue)
  }

  const restoreAutoScroll = (afterDrag: boolean) => {
    const track = trackRef.current
    const viewport = viewportRef.current
    if (!track) return

    viewport?.classList.remove(styles.marqueeViewportDragging)

    if (afterDrag) {
      measureLoopWidth()
      const loopW = loopWidthRef.current
      offsetRef.current = wrapOffset(offsetRef.current, loopW)
      const progress = loopProgress(offsetRef.current, loopW, scrollDirection)
      const delay = loopW > 0 ? -(progress * duration) : 0
      restartCssAnimation(delay)
      return
    }

    if (track.style.animation === 'none' || track.style.transform) {
      restartCssAnimation(parseFloat(animationDelayRef.current) || 0)
      return
    }

    track.style.animationPlayState = ''
  }

  const clearWatchdog = () => {
    if (watchdogRef.current != null) {
      clearTimeout(watchdogRef.current)
      watchdogRef.current = null
    }
  }

  const clearTouchListeners = () => {
    const viewport = viewportRef.current
    const listeners = touchListenersRef.current
    if (!listeners) return

    viewport?.removeEventListener('touchmove', listeners.move)
    document.removeEventListener('touchmove', listeners.move)
    document.removeEventListener('touchend', listeners.end, true)
    document.removeEventListener('touchcancel', listeners.end, true)
    document.removeEventListener('pointerup', listeners.pointerEnd, true)
    document.removeEventListener('pointercancel', listeners.pointerEnd, true)
    touchListenersRef.current = null
  }

  const endTouch = (session?: number) => {
    if (!holdActiveRef.current) return
    if (session != null && session !== touchSessionRef.current) return

    const wasDrag = dragActiveRef.current

    clearWatchdog()
    clearTouchListeners()

    holdActiveRef.current = false
    dragActiveRef.current = false
    activeTouchIdRef.current = null

    restoreAutoScroll(wasDrag)
  }

  useEffect(
    () => () => {
      clearWatchdog()
      if (holdActiveRef.current) endTouch()
    },
    [],
  )

  const pauseForHold = () => {
    const track = trackRef.current
    const viewport = viewportRef.current
    if (!track || !viewport) return

    viewport.classList.add(styles.marqueeViewportDragging)
    track.style.animationPlayState = 'paused'
    holdActiveRef.current = true
    dragActiveRef.current = false
  }

  const upgradeToDrag = () => {
    if (dragActiveRef.current) return

    const track = trackRef.current
    if (!track) return

    dragActiveRef.current = true
    measureLoopWidth()

    const loopW = loopWidthRef.current
    const current = loopW > 0 ? wrapOffset(readTranslateX(track), loopW) : readTranslateX(track)
    offsetRef.current = current
    applyDragTransform()
  }

  const scheduleWatchdog = (session: number) => {
    clearWatchdog()
    watchdogRef.current = setTimeout(() => {
      if (holdActiveRef.current && session === touchSessionRef.current) {
        endTouch(session)
      }
    }, TOUCH_WATCHDOG_MS)
  }

  const bindTouchSession = (session: number) => {
    const viewport = viewportRef.current
    if (!viewport) return

    const onTouchMove = (nativeEvent: TouchEvent) => {
      if (!holdActiveRef.current || session !== touchSessionRef.current) return

      const activeId = activeTouchIdRef.current
      if (activeId == null) return

      const activeTouch = Array.from(nativeEvent.touches).find((t) => t.identifier === activeId)
      if (!activeTouch) return

      const travel = Math.abs(activeTouch.clientX - touchStartXRef.current)
      if (!dragActiveRef.current && travel < DRAG_THRESHOLD_PX) return

      if (!dragActiveRef.current) upgradeToDrag()

      if (loopWidthRef.current <= 0) measureLoopWidth()

      const dx = activeTouch.clientX - lastTouchXRef.current
      lastTouchXRef.current = activeTouch.clientX
      offsetRef.current = wrapOffset(offsetRef.current + dx, loopWidthRef.current)
      applyDragTransform()
      nativeEvent.preventDefault()
    }

    const onTouchEnd = (nativeEvent: TouchEvent) => {
      if (!holdActiveRef.current || session !== touchSessionRef.current) return

      if (nativeEvent.type === 'touchcancel') {
        endTouch(session)
        return
      }

      const activeId = activeTouchIdRef.current
      if (activeId == null) return

      const ended = Array.from(nativeEvent.changedTouches).some((t) => t.identifier === activeId)
      const activeGone = !Array.from(nativeEvent.touches).some((t) => t.identifier === activeId)

      if (ended || (activeGone && nativeEvent.touches.length === 0)) {
        endTouch(session)
      }
    }

    const onPointerEnd = (nativeEvent: PointerEvent) => {
      if (!holdActiveRef.current || session !== touchSessionRef.current) return
      if (nativeEvent.pointerType === 'mouse') return
      endTouch(session)
    }

    touchListenersRef.current = {move: onTouchMove, end: onTouchEnd, pointerEnd: onPointerEnd}
    viewport.addEventListener('touchmove', onTouchMove, {passive: false})
    document.addEventListener('touchmove', onTouchMove, {passive: false})
    document.addEventListener('touchend', onTouchEnd, true)
    document.addEventListener('touchcancel', onTouchEnd, true)
    document.addEventListener('pointerup', onPointerEnd, true)
    document.addEventListener('pointercancel', onPointerEnd, true)
  }

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    if (!touch) return

    endTouch()

    const session = touchSessionRef.current + 1
    touchSessionRef.current = session

    pauseForHold()
    touchStartXRef.current = touch.clientX
    lastTouchXRef.current = touch.clientX
    activeTouchIdRef.current = touch.identifier

    bindTouchSession(session)
    scheduleWatchdog(session)
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

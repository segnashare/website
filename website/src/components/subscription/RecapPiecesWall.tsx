'use client'

import type {RecapWallItem} from '@/lib/subscription/recap-wall-types'
import {preloadRecapWallImages} from '@/lib/subscription/preload-recap-wall-images'
import {useEffect, useMemo, useState} from 'react'
import styles from './recapPiecesWall.module.css'

type Props = {
  items: RecapWallItem[]
  className?: string
  fade?: 'top' | 'left' | 'none'
  /** `columns` = défilé vertical (desktop) ; `rows` = rangées horizontales (mobile). */
  layout?: 'columns' | 'rows'
}

function splitIntoLanes(items: RecapWallItem[], laneCount: number): RecapWallItem[][] {
  const lanes: RecapWallItem[][] = Array.from({length: laneCount}, () => [])
  items.forEach((item, index) => {
    lanes[index % laneCount]!.push(item)
  })
  return lanes
}

function WallLane({
  items,
  ready,
  layout,
}: {
  items: RecapWallItem[]
  ready: boolean
  layout: 'columns' | 'rows'
}) {
  const loop = items.length > 0 ? [...items, ...items] : []
  const laneClass = layout === 'rows' ? styles.row : styles.column
  const trackClass = layout === 'rows' ? styles.rowTrack : styles.columnTrack
  const cardClass = layout === 'rows' ? styles.rowCard : styles.card
  return (
    <div className={laneClass} aria-hidden>
      <div className={trackClass} data-ready={ready ? 'true' : 'false'}>
        {loop.map((item, index) => (
          <div key={`${item.id}-${index}`} className={cardClass}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.coverUrl}
              alt=""
              className={styles.cardImg}
              loading="eager"
              decoding="async"
              fetchPriority={index < 6 ? 'high' : 'auto'}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export function RecapPiecesWall({items, className, fade = 'top', layout = 'columns'}: Props) {
  const laneCount = layout === 'rows' ? 2 : 3
  const lanes = useMemo(() => splitIntoLanes(items, laneCount), [items, laneCount])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void preloadRecapWallImages(items).then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [items])

  if (items.length === 0) return null

  return (
    <div
      className={[
        styles.wall,
        layout === 'rows' ? styles.wallRows : styles.wallColumns,
        ready ? styles.wallReady : styles.wallLoading,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    >
      {fade === 'top' ? <div className={styles.wallFadeTop} /> : null}
      {fade === 'left' ? <div className={styles.wallFadeLeft} /> : null}
      <div className={layout === 'rows' ? styles.wallStageRows : styles.wallStage}>
        {lanes.map((laneItems, index) => (
          <WallLane key={index} items={laneItems} ready={ready} layout={layout} />
        ))}
      </div>
    </div>
  )
}

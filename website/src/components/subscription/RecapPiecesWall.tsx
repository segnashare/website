'use client'

import type {RecapWallItem} from '@/lib/subscription/recap-wall-types'
import {useEffect, useMemo} from 'react'
import styles from './recapPiecesWall.module.css'

type Props = {
  items: RecapWallItem[]
  className?: string
  fade?: 'top' | 'left' | 'none'
}

function splitIntoColumns(items: RecapWallItem[], columnCount: number): RecapWallItem[][] {
  const columns: RecapWallItem[][] = Array.from({length: columnCount}, () => [])
  items.forEach((item, index) => {
    columns[index % columnCount]!.push(item)
  })
  return columns
}

function WallColumn({items}: {items: RecapWallItem[]}) {
  const loop = items.length > 0 ? [...items, ...items] : []
  return (
    <div className={styles.column} aria-hidden>
      <div className={styles.columnTrack}>
        {loop.map((item, index) => (
          <div key={`${item.id}-${index}`} className={styles.card}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.coverUrl}
              alt=""
              className={styles.cardImg}
              loading={index < items.length ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={index < 6 ? 'high' : 'auto'}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export function RecapPiecesWall({items, className, fade = 'top'}: Props) {
  const columns = useMemo(() => splitIntoColumns(items, 3), [items])

  useEffect(() => {
    for (const item of items) {
      const img = new Image()
      img.src = item.coverUrl
    }
  }, [items])

  if (items.length === 0) return null

  return (
    <div className={[styles.wall, className].filter(Boolean).join(' ')} aria-hidden>
      {fade === 'top' ? <div className={styles.wallFadeTop} /> : null}
      {fade === 'left' ? <div className={styles.wallFadeLeft} /> : null}
      <div className={styles.wallStage}>
        {columns.map((columnItems, index) => (
          <WallColumn key={index} items={columnItems} />
        ))}
      </div>
    </div>
  )
}

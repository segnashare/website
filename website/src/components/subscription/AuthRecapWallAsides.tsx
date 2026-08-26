'use client'

import {RECAP_WALL_ITEMS} from '@/lib/subscription/recap-wall-items'
import {RecapPiecesWall} from '@/components/subscription/RecapPiecesWall'
import {useEffect, useState} from 'react'

const MOBILE_MQ = '(max-width: 900px)'

type Props = {
  desktopClassName: string
  mobileClassName: string
}

/**
 * Un seul mur monté (desktop colonnes OU mobile rangées) —
 * évite de télécharger 2× les 56 médias quand l’autre est en `display: none`.
 */
export function AuthRecapWallAsides({desktopClassName, mobileClassName}: Props) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Avant matchMedia : placeholder pour garder la place (pas de double download).
  if (isMobile === null) {
    return (
      <>
        <aside className={desktopClassName} aria-hidden />
        <aside className={mobileClassName} aria-hidden />
      </>
    )
  }

  if (isMobile) {
    return (
      <aside className={mobileClassName} aria-hidden>
        <RecapPiecesWall items={RECAP_WALL_ITEMS} fade="none" layout="rows" />
      </aside>
    )
  }

  return (
    <aside className={desktopClassName} aria-hidden>
      <RecapPiecesWall items={RECAP_WALL_ITEMS} fade="none" layout="columns" />
    </aside>
  )
}

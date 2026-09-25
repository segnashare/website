'use client'

import {useEffect, useState} from 'react'

export type VisualViewportBox = {
  top: number
  height: number
  keyboardOpen: boolean
}

/**
 * Zone visible réelle (iOS/Android) : le clavier réduit `visualViewport`
 * sans toujours mettre à jour `100dvh` / `position: fixed; inset: 0`.
 */
export function useVisualViewportBox(): VisualViewportBox {
  const [box, setBox] = useState<VisualViewportBox>({top: 0, height: 0, keyboardOpen: false})

  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport
      if (!vv) {
        setBox({top: 0, height: window.innerHeight, keyboardOpen: false})
        return
      }
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setBox({
        top: vv.offsetTop,
        height: vv.height,
        keyboardOpen: covered > 80,
      })
    }
    update()
    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return box
}

export function scrollFieldAboveKeyboard(el: HTMLElement | null) {
  if (!el) return
  window.setTimeout(() => {
    el.scrollIntoView({block: 'center', behavior: 'smooth'})
  }, 280)
}

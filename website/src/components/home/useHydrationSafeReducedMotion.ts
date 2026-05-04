'use client'

import {useReducedMotion} from 'framer-motion'
import {useEffect, useState} from 'react'

/**
 * `useReducedMotion()` lit `matchMedia` seulement dans le navigateur. En SSR,
 * motion-dom laisse `prefersReducedMotion.current` à `null` ; au premier rendu
 * client il devient `true`/`false` — d’où un arbre différent (ex. `StagedHeroCycle`)
 * et une erreur d’hydratation. Jusqu’au montage, on se comporte comme « pas réduit ».
 */
export function useHydrationSafeReducedMotion(): boolean {
  const raw = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  return mounted ? Boolean(raw) : false
}

'use client'

import {useEffect, useState} from 'react'

/** True when the document has been scrolled past `thresholdPx` (navbar style switch). */
export function useNavScrollElevated(thresholdPx = 48) {
  const [isElevated, setIsElevated] = useState(false)

  useEffect(() => {
    const update = () => {
      setIsElevated(window.scrollY > thresholdPx)
    }
    update()
    window.addEventListener('scroll', update, {passive: true})
    return () => window.removeEventListener('scroll', update)
  }, [thresholdPx])

  return isElevated
}

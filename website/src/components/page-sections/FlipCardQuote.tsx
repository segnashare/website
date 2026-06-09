'use client'

import {useLayoutEffect, useRef} from 'react'
import type {PortableTextBlock} from '@portabletext/types'
import {PortableRichText} from '@/components/cms/PortableRichText'
import {plainTextFromPortableText} from '@/lib/horizontal-scroll-card-utils'
import styles from '@/components/page-sections/horizontalScrollCards.module.css'

type Props = {
  value: PortableTextBlock[]
}

function maxQuoteFontPx(box: {width: number; height: number}, textLength: number): number {
  const minSide = Math.min(box.width, box.height)
  const base = minSide * 0.34
  const lengthFactor = Math.max(0.38, 1 - Math.max(0, textLength - 20) * 0.0065)
  return Math.min(112, Math.max(16, base * lengthFactor))
}

/** Cherche la plus grande taille qui remplit la carte (haut-gauche → bas-droite) sans déborder. */
function fitQuoteFontSize(shell: HTMLElement, text: HTMLElement, textLength: number) {
  const maxWidth = shell.clientWidth
  const maxHeight = shell.clientHeight
  if (maxWidth <= 0 || maxHeight <= 0) return

  const minSize = 10
  let hi = maxQuoteFontPx({width: maxWidth, height: maxHeight}, textLength)
  let lo = minSize
  let best = minSize

  const fits = (size: number) => {
    text.style.fontSize = `${size}px`
    return text.scrollHeight <= maxHeight && text.scrollWidth <= maxWidth
  }

  while (lo <= hi) {
    const mid = Math.round(((lo + hi) / 2) * 2) / 2
    if (fits(mid)) {
      best = mid
      lo = mid + 0.5
    } else {
      hi = mid - 0.5
    }
  }

  text.style.fontSize = `${best}px`
}

export function FlipCardQuote({value}: Props) {
  const shellRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const plainText = plainTextFromPortableText(value)

  useLayoutEffect(() => {
    const shell = shellRef.current
    const text = textRef.current
    if (!shell || !text || !plainText) return

    const run = () => fitQuoteFontSize(shell, text, plainText.length)

    run()
    const observer = new ResizeObserver(run)
    observer.observe(shell)
    return () => observer.disconnect()
  }, [plainText, value])

  if (!value.length) return null

  return (
    <div ref={shellRef} className={styles.flipCardQuoteShell}>
      <div ref={textRef} className={styles.flipCardQuote}>
        <PortableRichText value={value} variant="compact" />
      </div>
    </div>
  )
}

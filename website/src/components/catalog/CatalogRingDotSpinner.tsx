import styles from './catalogRingDotSpinner.module.css'

type Props = {
  className?: string
  /** Points sur l’anneau (défaut 6 — aligné app `AuthRingDotSpinner`). */
  dotCount?: 6 | 8
  filledDots?: number
  spinning?: boolean
  'aria-label'?: string
}

const DOT = 9
const R = 14

/** Spinner anneau de points — même langage que l’app Segna. */
export function CatalogRingDotSpinner({
  className,
  dotCount = 6,
  filledDots = 6,
  spinning = true,
  'aria-label': ariaLabel = 'Chargement',
}: Props) {
  const step = 360 / dotCount
  const filled = Math.min(Math.max(filledDots, 1), dotCount)

  return (
    <span
      className={[styles.root, className].filter(Boolean).join(' ')}
      role={spinning ? 'status' : 'presentation'}
      aria-hidden={spinning ? undefined : true}
      aria-live={spinning ? 'polite' : undefined}
      aria-label={spinning ? ariaLabel : undefined}
    >
      <span
        className={`${styles.ring} ${spinning ? styles.ringSpin : ''}`}
        style={spinning ? {animationDuration: '0.9s'} : undefined}
      >
        {Array.from({length: dotCount}, (_, i) => (
          <span
            key={i}
            className={`${styles.dot} ${i < filled ? styles.dotActive : styles.dotIdle}`}
            style={{
              width: DOT,
              height: DOT,
              marginLeft: -DOT / 2,
              marginTop: -DOT / 2,
              transform: `rotate(${i * step}deg) translateY(-${R}px)`,
            }}
          />
        ))}
      </span>
    </span>
  )
}

import styles from './waveDotsLoader.module.css'

type Props = {
  /** Couleur des points (blanc sur CTA noir). */
  color?: string
  /** Diamètre en px (défaut 7 — aligné app mobile). */
  size?: number
  className?: string
  'aria-label'?: string
}

/**
 * 4 points horizontaux, animation vague (scale + opacity décalés) —
 * port de `segna-mobile` `WaveDotsLoader` pour les CTAs pastille.
 */
export function WaveDotsLoader({
  color = '#fff',
  size = 7,
  className,
  'aria-label': ariaLabel = 'Chargement',
}: Props) {
  return (
    <span
      className={[styles.row, className].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      {Array.from({length: 4}, (_, index) => (
        <span
          key={index}
          className={styles.dot}
          style={{
            width: size,
            height: size,
            backgroundColor: color,
            animationDelay: `${index * 120}ms`,
          }}
        />
      ))}
    </span>
  )
}

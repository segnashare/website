import styles from './homeHero.module.css'

const TRUSTPILOT_REVIEW_URL = 'https://fr.trustpilot.com/review/segnashare.com'

type Props = {
  className?: string
}

/** Rating line for hero: Trustpilot star + « 4.7/5 sur Trustpilot ». */
export function HeroTrustpilotRating({className}: Props) {
  const rootClass = className
    ? `${styles.trustpilotRating} ${className}`
    : styles.trustpilotRating

  return (
    <a
      href={TRUSTPILOT_REVIEW_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={rootClass}
      aria-label="4,7 sur 5 sur Trustpilot"
    >
      <span className={styles.trustpilotSep} aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/trustpilot.svg"
        alt=""
        width={16}
        height={16}
        className={styles.trustpilotIcon}
        decoding="async"
      />
      <span className={styles.trustpilotLabel}>4.7/5 sur Trustpilot</span>
    </a>
  )
}

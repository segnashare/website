import {CatalogPuzzleIntroFit} from '@/components/page-sections/CatalogPuzzleIntroFit'
import scrollStyles from '@/components/page-sections/horizontalScrollCards.module.css'
import type {ScrollCardSize} from '@/lib/catalog/scroll-card-size'
import {normalizeScrollCardSize} from '@/lib/catalog/scroll-card-size'
import styles from './catalogScrollStrip.module.css'

const SKELETON_COUNT = 6

type Props = {
  heading?: string
  intro?: string
  introCtaLabel?: string
  introCtaHref?: string
  cardSize?: ScrollCardSize
  stackedAfterSmall?: boolean
  stackedBeforeSmall?: boolean
}

/** Placeholder bandeau catalogue — cadres portrait grisés (Suspense / état vide). */
export function CatalogScrollStripSkeleton({
  heading,
  intro,
  introCtaLabel,
  introCtaHref,
  cardSize,
  stackedAfterSmall,
  stackedBeforeSmall,
}: Props) {
  const size = normalizeScrollCardSize(cardSize ?? 'small')
  const showIntro = Boolean(heading?.trim() || intro?.trim() || (introCtaLabel && introCtaHref))
  const stackCls = [
    stackedAfterSmall ? styles.sectionStackedAfter : '',
    stackedBeforeSmall ? styles.sectionStackedBefore : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section
      className={`${styles.section}${stackCls ? ` ${stackCls}` : ''}`}
      aria-busy
      aria-label="Chargement"
    >
      {showIntro ? (
        <header className={styles.introWrap}>
          <CatalogPuzzleIntroFit
            heading={heading?.trim() || undefined}
            lead={intro?.trim() || undefined}
            introCtaLabel={introCtaLabel}
            introCtaHref={introCtaHref}
            compact={stackedAfterSmall || stackedBeforeSmall}
          />
        </header>
      ) : null}
      <div className={`${scrollStyles.fullBleed} ${styles.scrollBleed}`}>
        <div className={scrollStyles.scrollBlock} data-card-size={size}>
          <div className={styles.skeletonTrack} aria-hidden>
            {Array.from({length: SKELETON_COUNT}).map((_, i) => (
              <div key={i} className={`${scrollStyles.slide} ${scrollStyles.slidePortrait}`}>
                <div className={styles.skeletonCard}>
                  <div className={styles.skeletonPhoto} />
                  <div className={styles.skeletonMeta}>
                    <div className={styles.skeletonLine} />
                    <div className={styles.skeletonLineShort} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

import scrollStyles from '@/components/page-sections/horizontalScrollCards.module.css'
import styles from './catalogScrollStrip.module.css'

const SKELETON_COUNT = 6

/** Placeholder bandeau catalogue (Suspense) — cadres portrait grisés. */
export function CatalogScrollStripSkeleton() {
  return (
    <section className={styles.section} aria-busy aria-label="Chargement">
      <div className={`${scrollStyles.fullBleed} ${styles.scrollBleed}`}>
        <div className={scrollStyles.scrollBlock} data-card-size="small">
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

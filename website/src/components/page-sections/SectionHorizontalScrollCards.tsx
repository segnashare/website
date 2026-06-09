import type {HorizontalScrollCardsSection} from '@/lib/sanity'
import {CatalogPuzzleIntroFit} from '@/components/page-sections/CatalogPuzzleIntroFit'
import {cardHasContent} from '@/components/page-sections/HorizontalScrollCard'
import {HorizontalScrollTrack} from '@/components/page-sections/HorizontalScrollTrack'
import {normalizeScrollCardSize} from '@/lib/catalog/scroll-card-size'
import styles from '@/components/page-sections/horizontalScrollCards.module.css'

type Props = {
  section: HorizontalScrollCardsSection
  /** Resserre l’espacement quand plusieurs bandeaux petits se suivent. */
  stackedAfterSmall?: boolean
  stackedBeforeSmall?: boolean
}

export function SectionHorizontalScrollCards({
  section,
  stackedAfterSmall,
  stackedBeforeSmall,
}: Props) {
  const items = (section.items ?? []).filter(cardHasContent)
  const heading = section.heading?.trim()
  if (!heading || items.length === 0) {
    return null
  }

  const isDark = section.surfaceTheme === 'dark'
  const introTone = isDark ? 'dark' : 'light'
  const cardSize = normalizeScrollCardSize(section.cardSize)
  const surfaceStyle = {
    backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
  }

  const stackCls = [
    stackedAfterSmall ? styles.fullBleedStackedAfter : '',
    stackedBeforeSmall ? styles.fullBleedStackedBefore : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section
      className={`${styles.fullBleed}${isDark ? ` ${styles.surfaceDark}` : ` ${styles.surfaceLight}`}${stackCls ? ` ${stackCls}` : ''}`}
      style={surfaceStyle}
      data-motion={section.motionPreset ?? 'none'}
    >
      <div className={styles.inner}>
        <CatalogPuzzleIntroFit
          heading={heading}
          lead={section.lead?.trim()}
          introCtaLabel={section.introCtaLabel}
          introCtaHref={section.introCtaHref}
          primaryCtaLabel={section.primaryCtaLabel}
          primaryCtaHref={section.primaryCtaHref}
          secondaryCtaLabel={section.secondaryCtaLabel}
          secondaryCtaHref={section.secondaryCtaHref}
          introTone={introTone}
          compact={stackedAfterSmall || stackedBeforeSmall}
        />
      </div>

      <div className={styles.scrollBlock} data-card-size={cardSize}>
        <div className={styles.scrollViewport}>
          <HorizontalScrollTrack
            items={items}
            scrollMotion={section.scrollMotion}
            scrollDirection={section.scrollDirection}
            scrollSpeed={section.scrollSpeed}
          />
        </div>
      </div>
    </section>
  )
}

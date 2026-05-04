import type {CSSProperties} from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type {PortableTextBlock} from '@portabletext/types'
import {PortableRichText} from '@/components/cms/PortableRichText'
import type {ThreeStepCardItem, ThreeStepCardsSection} from '@/lib/sanity'
import {urlFor} from '@/lib/sanity'
import styles from './threeStepCards.module.css'

type Props = {
  section: ThreeStepCardsSection
}

function resolveBandColor(hex: string | undefined): string {
  const t = hex?.trim()
  if (t && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(t)) return t
  return '#f9f7f2'
}

function isWhiteText(section: ThreeStepCardsSection): boolean {
  return section.threeStepTextColor === 'white'
}

function isExternalHref(href: string) {
  const t = href.trim().toLowerCase()
  return (
    t.startsWith('http://') ||
    t.startsWith('https://') ||
    t.startsWith('//') ||
    t.startsWith('mailto:') ||
    t.startsWith('tel:')
  )
}

function mediaClass(format: ThreeStepCardItem['frameFormat']): string {
  if (format === 'portrait') return styles.mediaPortrait
  if (format === 'landscape') return styles.mediaLandscape
  return styles.mediaSquare
}

function isPortableDescription(value: ThreeStepCardItem['description']): value is PortableTextBlock[] {
  return Array.isArray(value) && value.length > 0 && value.every((b) => b && typeof b === 'object' && '_type' in b)
}

export function SectionThreeStepCards({section}: Props) {
  const items = (section.threeStepItems ?? []).slice(0, 3)
  if (items.length === 0) return null

  const bg = resolveBandColor(section.threeStepBandColor)
  const bandStyle: CSSProperties = {backgroundColor: bg}
  const toneClass = isWhiteText(section) ? styles.toneTextWhite : styles.toneTextBlack
  const bareLayout = section.threeStepCardsLayout === 'bare'

  const primaryLabel = section.threeStepPrimaryCtaLabel?.trim()
  const primaryHref = section.threeStepPrimaryCtaHref?.trim()
  const showPrimary = Boolean(primaryLabel && primaryHref)

  const secondaryLabel = section.threeStepSecondaryCtaLabel?.trim()
  const secondaryHref = section.threeStepSecondaryCtaHref?.trim()
  const showSecondary = Boolean(secondaryLabel && secondaryHref)

  const title = section.threeStepTitle?.trim()
  if (!title) return null

  return (
    <section
      className={[styles.band, toneClass].join(' ')}
      style={bandStyle}
      data-motion={section.motionPreset ?? 'none'}
      aria-labelledby={`three-step-${section._key}`}
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          <h2 id={`three-step-${section._key}`} className={styles.sectionTitle}>
            {title}
          </h2>
          {section.threeStepSubtitle?.trim() ? (
            <p className={styles.sectionSubtitle}>{section.threeStepSubtitle.trim()}</p>
          ) : null}
        </header>

        <div className={styles.cards}>
          {items.map((card) => {
            const img = card.image
            const asset = img?.asset
            const hasImage = Boolean(asset?._ref || asset?.url)
            const hasTitle = Boolean(card.title?.trim())
            const hasDesc =
              isPortableDescription(card.description) ||
              (typeof card.description === 'string' && Boolean(card.description.trim()))
            if (!hasImage && !hasTitle && !hasDesc) return null

            const src =
              hasImage && img ? urlFor(img).width(960).height(960).fit('max').auto('format').url() : null
            const alt = img?.alt?.trim() || ''
            const cardClass = [
              bareLayout ? styles.cardBare : styles.card,
              !hasImage ? styles.cardNoMedia : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <article key={card._key} className={cardClass}>
                {hasImage && src ? (
                  <div
                    className={[styles.media, mediaClass(card.frameFormat), bareLayout ? styles.mediaBare : '']
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <Image
                      src={src}
                      alt={alt}
                      fill
                      className={styles.mediaImg}
                      sizes="(max-width: 900px) 88vw, 30vw"
                    />
                  </div>
                ) : null}
                {card.title?.trim() ? (
                  <h3 className={bareLayout ? `${styles.cardTitle} ${styles.cardTitleBare}` : styles.cardTitle}>
                    {card.title.trim()}
                  </h3>
                ) : null}
                {isPortableDescription(card.description) ? (
                  <PortableRichText
                    value={card.description}
                    variant="compact"
                    className={bareLayout ? `${styles.cardDesc} ${styles.cardDescBare}` : styles.cardDesc}
                  />
                ) : typeof card.description === 'string' && card.description.trim() ? (
                  <p className={bareLayout ? `${styles.cardDesc} ${styles.cardDescBare}` : styles.cardDesc}>
                    {card.description.trim()}
                  </p>
                ) : null}
              </article>
            )
          })}
        </div>

        {showPrimary || showSecondary ? (
          <footer className={styles.footer}>
            {showPrimary ? (
              isExternalHref(primaryHref!) ? (
                <a
                  href={primaryHref}
                  className={styles.primaryCta}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {primaryLabel}
                </a>
              ) : (
                <Link href={primaryHref!} className={styles.primaryCta}>
                  {primaryLabel}
                </Link>
              )
            ) : null}
            {showSecondary ? (
              isExternalHref(secondaryHref!) ? (
                <a
                  href={secondaryHref}
                  className={styles.secondaryLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {secondaryLabel}
                </a>
              ) : (
                <Link href={secondaryHref!} className={styles.secondaryLink}>
                  {secondaryLabel}
                </Link>
              )
            ) : null}
          </footer>
        ) : null}
      </div>
    </section>
  )
}

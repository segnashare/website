import type {CSSProperties} from 'react'
import Link from 'next/link'
import type {HelpCenterHubSection} from '@/lib/sanity'
import {FaqAccordion} from '@/components/page-sections/FaqAccordion'
import styles from './helpCenterHub.module.css'

type Props = {
  section: HelpCenterHubSection
}

function resolveHubBackground(hex: string | undefined): string {
  const t = hex?.trim()
  if (t && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(t)) return t
  return '#f0f4f8'
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

function HubCta({href, label}: {href: string; label: string}) {
  const raw = href.trim() || '/aide'
  if (isExternalHref(raw)) {
    return (
      <a href={raw} className={styles.cta} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    )
  }
  return (
    <Link href={raw} className={styles.cta}>
      {label}
    </Link>
  )
}

/** Rétrocompat : anciens blocs sans `hubTextColor`. */
function isWhiteText(section: HelpCenterHubSection): boolean {
  return section.hubTextColor === 'white'
}

export function SectionHelpCenterHub({section}: Props) {
  const bg = resolveHubBackground(section.hubBackgroundColor)
  const bandStyle: CSSProperties = {backgroundColor: bg}
  const toneClass = isWhiteText(section) ? styles.toneTextWhite : styles.toneTextBlack

  const ctaLabel = section.helpHubCtaLabel?.trim()
  const ctaHref = section.helpHubCtaHref?.trim()
  const showCta = Boolean(ctaLabel && ctaHref)

  const hasFaq = Boolean(section.helpArticleRefs?.length)

  return (
    <section
      className={[styles.band, toneClass].filter(Boolean).join(' ')}
      style={bandStyle}
      aria-labelledby={`faq-hub-${section._key}`}
    >
      <div className={styles.inner}>
        <div className={styles.grid}>
          <div className={styles.colLeft}>
            <h2 id={`faq-hub-${section._key}`} className={styles.title}>
              {section.hubTitle}
            </h2>
            {section.hubIntro?.trim() ? <p className={styles.intro}>{section.hubIntro.trim()}</p> : null}
            {showCta ? <HubCta href={ctaHref!} label={ctaLabel!} /> : null}
          </div>
          <div className={styles.colRight}>
            {hasFaq ? (
              <FaqAccordion items={section.helpArticleRefs} embedded />
            ) : (
              <p className={styles.emptyFaq}>
                Sélectionnez un ou plusieurs articles d’aide (avec des Q/R) dans le bloc FAQ pour les afficher ici.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

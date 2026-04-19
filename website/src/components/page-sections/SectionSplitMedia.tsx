import Image from 'next/image'
import type {HomeSection} from '@/lib/sanity'
import {urlFor} from '@/lib/sanity'
import {SectionBlockDualStates} from '@/components/page-sections/SectionBlockDualStates'
import {FaqAccordion} from '@/components/page-sections/FaqAccordion'
import catalogStyles from '@/components/page-sections/catalogPuzzle.module.css'
import styles from './page-sections.module.css'

type Props = {
  section: HomeSection
  imagePosition: 'left' | 'right'
}

function isDualMode(section: HomeSection) {
  return Boolean(section.dualTabsEnabled && section.tab1Label?.trim() && section.tab2Label?.trim())
}

export function SectionSplitMedia({section, imagePosition: _imagePosition}: Props) {
  const dual = isDualMode(section)
  const imageUrl =
    !dual && section.image?.asset
      ? urlFor(section.image).width(1200).height(900).fit('crop').url()
      : null

  const textOnlyNarrow = !dual && !imageUrl ? ` ${styles.splitSectionTextOnly}` : ''

  const bg = section.backgroundColor?.trim()
  const hasBg = Boolean(bg)
  const lightText = section.textOnBackground === 'light'

  const lead = section.text?.trim() ?? ''

  return (
    <section
      className={hasBg ? styles.splitSectionBleed : styles.splitSectionSurface}
      style={hasBg ? {backgroundColor: bg} : undefined}
      data-motion={section.motionPreset ?? 'none'}
    >
      <div className={`${styles.splitInner}${textOnlyNarrow}`}>
        <header className={`${styles.splitSectionHeader} ${lightText ? catalogStyles.introOnDark : ''}`}>
          <h2 className={catalogStyles.heading}>{section.title}</h2>
          {lead ? <p className={`${catalogStyles.lead} ${styles.splitLead}`}>{lead}</p> : null}
        </header>

        {dual ? (
          <SectionBlockDualStates section={section} lightText={lightText} />
        ) : imageUrl ? (
          <div className={styles.splitSimpleGrid}>
            <div className={styles.splitMedia}>
              <Image
                src={imageUrl}
                alt={section.image?.alt ?? section.title}
                width={1200}
                height={900}
                sizes="(max-width: 767px) 100vw, 80vw"
              />
            </div>
          </div>
        ) : null}
        <FaqAccordion items={section.faqRefs} className={lightText ? catalogStyles.introOnDark : undefined} />
      </div>
    </section>
  )
}

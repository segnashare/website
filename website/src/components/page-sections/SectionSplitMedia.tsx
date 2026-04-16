import Image from 'next/image'
import type {HomeSection} from '@/lib/sanity'
import {urlFor} from '@/lib/sanity'
import styles from './page-sections.module.css'

type Props = {
  section: HomeSection
  imagePosition: 'left' | 'right'
}

export function SectionSplitMedia({section, imagePosition}: Props) {
  const imageUrl = section.image?.asset ? urlFor(section.image).width(1200).height(900).fit('crop').url() : null
  const layoutClass = imagePosition === 'right' ? styles.splitImageRight : styles.splitImageLeft
  const singleCol = !imageUrl ? ` ${styles.splitSectionTextOnly}` : ''

  return (
    <section
      className={`${styles.splitSection}${singleCol} ${layoutClass}`}
      data-motion={section.motionPreset ?? 'none'}
    >
      <div className={styles.splitCopy}>
        <h2 className={styles.splitTitle}>{section.title}</h2>
        <p className={styles.splitText}>{section.text}</p>
      </div>
      {imageUrl ? (
        <div className={styles.splitMedia}>
          <Image
            src={imageUrl}
            alt={section.image?.alt ?? section.title}
            width={1200}
            height={900}
            sizes="(max-width: 767px) 100vw, 50vw"
          />
        </div>
      ) : null}
    </section>
  )
}

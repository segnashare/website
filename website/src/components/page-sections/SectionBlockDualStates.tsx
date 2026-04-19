'use client'

import Image from 'next/image'
import type {PortableTextBlock} from '@portabletext/types'
import {useMemo, useState} from 'react'
import {PortableRichText} from '@/components/cms/PortableRichText'
import type {HomeSection, SanityImage, SectionBlockDualImageFormat, SectionBlockDualRow} from '@/lib/sanity'
import {urlFor} from '@/lib/sanity'
import styles from './page-sections.module.css'

function blocksNonEmpty(value?: PortableTextBlock[] | null) {
  return Array.isArray(value) && value.length > 0
}

function rowHasContent(row: SectionBlockDualRow) {
  const img = row.image?.asset && (row.image.asset._ref || row.image.asset.url)
  return Boolean(img || blocksNonEmpty(row.body))
}

function normalizeImageFormat(value: SectionBlockDualRow['imageFormat']): SectionBlockDualImageFormat {
  if (value === 'square' || value === 'portrait' || value === 'landscape') return value
  return 'landscape'
}

function imageFormatClass(format: SectionBlockDualImageFormat) {
  if (format === 'square') return styles.splitBlockMediaSquare
  if (format === 'portrait') return styles.splitBlockMediaPortrait
  return styles.splitBlockMediaLandscape
}

function rowImageCropDims(format: SectionBlockDualImageFormat) {
  if (format === 'square') return {w: 720, h: 720}
  if (format === 'portrait') return {w: 540, h: 720}
  return {w: 800, h: 450}
}

function rowImageUrl(image: SanityImage, format: SectionBlockDualImageFormat) {
  const {w, h} = rowImageCropDims(format)
  return urlFor(image).width(w).height(h).fit('crop').url()
}

function DualRow({row}: {row: SectionBlockDualRow}) {
  const asset = row.image?.asset
  const imageFormat = normalizeImageFormat(row.imageFormat)
  const imageUrl =
    asset && (asset._ref || asset.url) && row.image ? rowImageUrl(row.image, imageFormat) : null
  const mediaRight = row.mediaPosition === 'right'
  const hasBody = blocksNonEmpty(row.body)

  if (!rowHasContent(row)) return null

  return (
    <div
      className={`${styles.splitBlockRow} ${mediaRight ? styles.splitBlockRowMediaRight : styles.splitBlockRowMediaLeft}`}
    >
      <div className={styles.splitBlockRowGrid}>
        {imageUrl ? (
          <div className={`${styles.splitBlockMedia} ${imageFormatClass(imageFormat)}`}>
            <div className={styles.splitBlockMediaInner}>
              <Image
                src={imageUrl}
                alt={row.image?.alt?.trim() ?? ''}
                fill
                sizes="(max-width: 767px) min(88vw, 16rem), min(22vw, 14rem)"
                className={styles.splitBlockMediaImg}
              />
            </div>
          </div>
        ) : null}
        {hasBody ? (
          <div className={styles.splitBlockProseCard}>
            <PortableRichText value={row.body!} className={styles.splitBlockBody} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

type Props = {
  section: HomeSection
  lightText: boolean
}

export function SectionBlockDualStates({section, lightText}: Props) {
  const tab1 = section.tab1Label?.trim() || 'État 1'
  const tab2 = section.tab2Label?.trim() || 'État 2'
  const rows1 = useMemo(
    () => (section.state1Rows ?? []).filter(rowHasContent),
    [section.state1Rows],
  )
  const rows2 = useMemo(
    () => (section.state2Rows ?? []).filter(rowHasContent),
    [section.state2Rows],
  )

  const [active, setActive] = useState<0 | 1>(0)
  const activeRows = active === 0 ? rows1 : rows2

  const tabRailClass = [
    styles.splitBlockTabRail,
    lightText ? styles.splitBlockTabRailOnDark : styles.splitBlockTabRailOnLight,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={styles.splitBlockDualRoot}>
      <div className={tabRailClass} role="tablist" aria-label="Contenu à bascule">
        <button
          type="button"
          role="tab"
          aria-selected={active === 0}
          className={`${styles.splitBlockTab} ${active === 0 ? styles.splitBlockTabActive : ''}`}
          onClick={() => setActive(0)}
        >
          {tab1}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === 1}
          className={`${styles.splitBlockTab} ${active === 1 ? styles.splitBlockTabActive : ''}`}
          onClick={() => setActive(1)}
        >
          {tab2}
        </button>
      </div>

      <div className={styles.splitBlockRows} role="tabpanel">
        {activeRows.length === 0 ? (
          <p className={styles.splitBlockEmpty}>Ajoutez des rangées (image + texte) pour cet état dans Sanity.</p>
        ) : (
          activeRows.map((row) => <DualRow key={row._key} row={row} />)
        )}
      </div>
    </div>
  )
}

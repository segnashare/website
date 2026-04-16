import Image from 'next/image'
import type {SplitFeatureSection, SplitPane, SanityImage} from '@/lib/sanity'
import {urlFor} from '@/lib/sanity'
import {SplitPaneVideoLazy} from '@/components/page-sections/SplitPaneVideoLazy'
import {mediaFrameClass} from '@/components/page-sections/splitFeatureMediaFrame'
import {SplitPaneText} from './SplitPaneText'
import styles from './splitFeatureSection.module.css'

type Props = {
  section: SplitFeatureSection
}

function hotspotObjectPosition(image?: SanityImage): `${number}% ${number}%` | undefined {
  const h = image?.hotspot
  if (h == null || typeof h.x !== 'number' || typeof h.y !== 'number') return undefined
  return `${Math.round(h.x * 100)}% ${Math.round(h.y * 100)}%`
}

function SplitPaneMedia({pane, mediaRounded}: {pane: SplitPane; mediaRounded: boolean}) {
  const kind = pane.contentKind ?? 'text'
  const roundedCls = mediaRounded ? styles.mediaPaneRounded : ''
  if (kind === 'image') {
    const src = pane.image?.asset ? urlFor(pane.image).width(2000).height(2800).fit('crop').url() : null
    if (!src) return null
    const pos = hotspotObjectPosition(pane.image)
    return (
      <div
        className={`${styles.pane} ${styles.mediaPane} ${roundedCls} ${mediaFrameClass(
          pane.mediaFrameFormat,
        )}`}
      >
        <div className={styles.mediaFill}>
          <Image
            src={src}
            alt={pane.image?.alt ?? ''}
            fill
            sizes="(max-width: 767px) 100vw, 50vw"
            className={styles.coverImage}
            style={pos ? {objectPosition: pos} : undefined}
          />
        </div>
      </div>
    )
  }

  if (kind === 'video') {
    return <SplitPaneVideoLazy pane={pane} rounded={mediaRounded} />
  }

  return null
}

function ratioClass(ratio?: SplitFeatureSection['splitRatio']) {
  if (ratio === '33-67') return styles.gridRatio33_67
  if (ratio === '67-33') return styles.gridRatio67_33
  return styles.gridRatio50_50
}

export function SectionSplitFeature({section}: Props) {
  const left = section.leftPane
  const right = section.rightPane
  if (!left || !right) return null

  const bg = section.backgroundColor?.trim() || '#0a0a0a'
  const fg = section.foregroundColor?.trim() || '#faf8f5'
  const mediaRounded = section.contentWidth === 'inset'

  const renderPane = (pane: SplitPane) => {
    const kind = pane.contentKind ?? 'text'
    if (kind === 'text') {
      return <SplitPaneText pane={pane} foregroundColor={fg} />
    }
    return <SplitPaneMedia pane={pane} mediaRounded={mediaRounded} />
  }

  return (
    <section
      className={styles.root}
      style={{backgroundColor: bg}}
      data-motion={section.motionPreset ?? 'none'}
    >
      <div
        className={`${styles.contentShell}${
          section.contentWidth === 'inset' ? ` ${styles.contentShellInset}` : ''
        }`}
      >
        <div className={`${styles.grid} ${ratioClass(section.splitRatio)}`}>
          {renderPane(left)}
          {renderPane(right)}
        </div>
      </div>
    </section>
  )
}

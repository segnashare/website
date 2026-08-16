'use client'

import {useCallback, useState} from 'react'
import Image from 'next/image'
import type {SplitPane, SanityImage} from '@/lib/sanity'
import {urlFor} from '@/lib/sanity'
import {
  vimeoEmbedSrc,
  withVideoAutoplay,
  youtubeEmbedSrc,
  youtubePosterUrl,
} from '@/components/page-sections/splitFeatureVideoUrls'
import {mediaFrameClass} from '@/components/page-sections/splitFeatureMediaFrame'
import styles from './splitFeatureSection.module.css'

function hotspotObjectPosition(image?: SanityImage): `${number}% ${number}%` | undefined {
  const h = image?.hotspot
  if (h == null || typeof h.x !== 'number' || typeof h.y !== 'number') return undefined
  return `${Math.round(h.x * 100)}% ${Math.round(h.y * 100)}%`
}

type Props = {
  pane: SplitPane
  /** Coins arrondis uniquement quand le bloc a des marges (contentWidth inset). */
  rounded?: boolean
}

export function SplitPaneVideoLazy({pane, rounded = false}: Props) {
  const [active, setActive] = useState(false)

  const fileUrl = pane.videoFile?.asset?.url?.trim()
  const pageUrl = pane.videoUrl?.trim()
  const streamRef = fileUrl || pageUrl
  if (!streamRef) return null

  const ytBase = !fileUrl && pageUrl ? youtubeEmbedSrc(pageUrl) : null
  const vmBase = !fileUrl && pageUrl ? vimeoEmbedSrc(pageUrl) : null

  const posterFromCms = pane.videoPoster?.asset
    ? urlFor(pane.videoPoster).width(2200).height(1240).fit('max').quality(92).auto('format').url()
    : null
  const ytFallbackPoster = !fileUrl && pageUrl ? youtubePosterUrl(pageUrl) : null
  const posterSrc = posterFromCms ?? ytFallbackPoster
  const posterPos = posterFromCms ? hotspotObjectPosition(pane.videoPoster) : undefined

  const activate = useCallback(() => {
    setActive(true)
  }, [])

  const frameCls = mediaFrameClass(pane.mediaFrameFormat)
  const roundedCls = rounded ? styles.mediaPaneRounded : ''

  if (active) {
    if (ytBase || vmBase) {
      const src = withVideoAutoplay(ytBase ?? vmBase!)
      return (
        <div className={`${styles.pane} ${styles.mediaPane} ${roundedCls} ${frameCls}`}>
          <iframe
            className={styles.videoIframe}
            src={src}
            title="Vidéo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            data-cookieconsent="marketing"
          />
        </div>
      )
    }

    return (
      <div className={`${styles.pane} ${styles.mediaPane} ${roundedCls} ${frameCls}`}>
        <video
          className={styles.nativeVideo}
          src={streamRef}
          controls
          playsInline
          autoPlay
          preload="metadata"
        />
      </div>
    )
  }

  return (
    <div className={`${styles.pane} ${styles.mediaPane} ${roundedCls} ${frameCls}`}>
      <div className={styles.mediaFill}>
        <div className={styles.videoLazyPoster}>
          {posterSrc ? (
            <Image
              src={posterSrc}
              alt={pane.videoPoster?.alt?.trim() || 'Aperçu vidéo'}
              fill
              sizes="(max-width: 767px) 100vw, 50vw"
              className={styles.coverImage}
              style={posterPos ? {objectPosition: posterPos} : undefined}
            />
          ) : (
            <div className={styles.videoPosterFallback} aria-hidden />
          )}
          <button
            type="button"
            className={styles.videoPlayCue}
            onClick={activate}
            aria-label="Lire la vidéo"
          >
            <span className={styles.videoPlayTriangle} aria-hidden />
            Lire
          </button>
        </div>
      </div>
    </div>
  )
}

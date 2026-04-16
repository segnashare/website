import type {SplitPane} from '@/lib/sanity'
import styles from './splitFeatureSection.module.css'

/** Classes CSS pour les trois formats de cadre média (split deux colonnes). */
export function mediaFrameClass(format?: SplitPane['mediaFrameFormat']): string {
  if (format === 'landscape') return styles.mediaFrameLandscape
  if (format === 'square') return styles.mediaFrameSquare
  return styles.mediaFramePortrait
}

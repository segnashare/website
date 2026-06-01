import type {ReactNode} from 'react'
import type {SectionDeviceVisibility} from '@/lib/sanity'
import styles from './page-sections.module.css'

/** Seuil aligné sur le reste du site (catalogue puzzle, hero, etc.). */
export const DESKTOP_MIN_PX = 768

export function resolveSectionDeviceVisibility(section: SectionDeviceVisibility): {
  render: boolean
  wrapperClassName?: string
} {
  const showDesktop = section.showOnDesktop !== false
  const showMobile = section.showOnMobile !== false

  if (!showDesktop && !showMobile) {
    return {render: false}
  }

  if (showDesktop && showMobile) {
    return {render: true}
  }

  return {
    render: true,
    wrapperClassName: showDesktop ? styles.sectionDesktopOnly : styles.sectionMobileOnly,
  }
}

type SectionVisibilityGateProps = {
  section: SectionDeviceVisibility
  children: ReactNode
}

/** Masque ou affiche un bloc selon les réglages Sanity desktop / mobile. */
export function SectionVisibilityGate({section, children}: SectionVisibilityGateProps) {
  const visibility = resolveSectionDeviceVisibility(section)
  if (!visibility.render) return null
  if (!visibility.wrapperClassName) return children
  return <div className={visibility.wrapperClassName}>{children}</div>
}

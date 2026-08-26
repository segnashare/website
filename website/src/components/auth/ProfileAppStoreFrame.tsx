'use client'

import {buildAppHandoffUrl} from '@/lib/auth/build-app-handoff-url'
import {trackWebsiteEvent} from '@/lib/analytics/track'
import {
  openIosAppOrAppStore,
  SEGNA_APP_BASE_URL,
  SEGNA_APP_STORE_URL,
} from '@/lib/catalog/catalog-app-links'
import {detectClientPlatform} from '@/lib/platform/client-platform'
import {useCallback, useState} from 'react'
import hubStyles from './profilePage.module.css'
import shellStyles from './accountSectionShell.module.css'

type Props = {
  className?: string
  /** Compact = sidebar compte ; sinon frame hub profil (taille d’origine). */
  compact?: boolean
}

export function ProfileAppStoreFrame({className, compact = false}: Props) {
  const [pending, setPending] = useState(false)
  const styles = compact ? shellStyles : hubStyles

  const downloadApp = useCallback(async () => {
    if (pending) return
    setPending(true)
    try {
      const appUrl = await buildAppHandoffUrl('/profile?tab=plus')
      trackWebsiteEvent('cta_clicked', {
        cta_label: 'Télécharger l’app',
        cta_href: appUrl || SEGNA_APP_STORE_URL || SEGNA_APP_BASE_URL,
        placement: 'profile_download_app',
      })
      trackWebsiteEvent('app_open_intent', {
        destination: SEGNA_APP_STORE_URL ? 'app_store' : 'app_handoff',
        href: appUrl || SEGNA_APP_STORE_URL || SEGNA_APP_BASE_URL,
        placement: 'profile_download_app',
      })
      if (detectClientPlatform() === 'ios' && SEGNA_APP_STORE_URL) {
        openIosAppOrAppStore(appUrl, SEGNA_APP_STORE_URL)
        return
      }
      if (SEGNA_APP_STORE_URL) {
        window.open(SEGNA_APP_STORE_URL, '_blank', 'noopener,noreferrer')
        return
      }
      window.location.assign(appUrl || `${SEGNA_APP_BASE_URL}/profile?tab=plus`)
    } catch {
      window.location.assign(SEGNA_APP_STORE_URL || SEGNA_APP_BASE_URL)
    } finally {
      setPending(false)
    }
  }, [pending])

  return (
    <button
      type="button"
      className={[
        styles.appDownload,
        compact ? shellStyles.appDownloadCompact : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={pending}
      onClick={() => void downloadApp()}
    >
      <span className={styles.appDownloadTitle}>Télécharger l’app</span>
      {!compact ? (
        <span className={styles.appDownloadSubtitle}>
          Louez vos pièces, renouvelez quand vous voulez, et profitez d’avantages à l’achat.
        </span>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/app-store-badge.png"
        alt="Download on the App Store"
        className={styles.appDownloadBadge}
        width={180}
        height={52}
        decoding="async"
      />
    </button>
  )
}

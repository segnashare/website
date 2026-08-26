'use client'

import {ProfileAppStoreFrame} from '@/components/auth/ProfileAppStoreFrame'
import {
  getWebsiteOrderBadgeCount,
  subscribeWebsiteOrderBadge,
} from '@/lib/orders/website-order-badge'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {useCallback, useEffect, useState, type ReactNode} from 'react'
import styles from './accountSectionShell.module.css'

export type AccountSectionId = 'commandes' | 'details' | 'abonnement' | 'preferences'

const NAV_ITEMS: Array<{
  id: AccountSectionId
  label: string
  href: string
  match: (pathname: string) => boolean
}> = [
  {
    id: 'commandes',
    label: 'Commandes & retours',
    href: '/profil/commandes',
    match: (p) => p === '/profil/commandes' || p.startsWith('/profil/commandes/'),
  },
  {
    id: 'details',
    label: 'Détails et sécurité',
    href: '/profil/details',
    match: (p) => p === '/profil/details' || p.startsWith('/profil/details/'),
  },
  {
    id: 'abonnement',
    label: 'Abonnement (SegnaX)',
    href: '/profil/abonnement',
    match: (p) => p === '/profil/abonnement' || p.startsWith('/profil/abonnement/'),
  },
  {
    id: 'preferences',
    label: 'Préférences de communication',
    href: '/profil/preferences',
    match: (p) => p === '/profil/preferences' || p.startsWith('/profil/preferences/'),
  },
]

type Props = {
  children: ReactNode
  /** Titre affiché au-dessus du contenu (desktop). */
  title?: string
  /** Sous-titre optionnel sous le titre de contenu. */
  lead?: string
  /** Centre titre + contenu dans le panneau droit (hors nav). */
  centerContent?: boolean
}

export function AccountSectionShell({children, title, lead, centerContent = false}: Props) {
  const pathname = usePathname() || ''
  const [pending, setPending] = useState(false)
  const [orderBadge, setOrderBadge] = useState(0)

  useEffect(() => {
    const sync = () => setOrderBadge(getWebsiteOrderBadgeCount())
    sync()
    return subscribeWebsiteOrderBadge(sync)
  }, [])

  const signOut = useCallback(async () => {
    setPending(true)
    try {
      const supabase = createSupabaseBrowserClient()
      await supabase.auth.signOut()
      window.location.assign('/')
    } catch {
      setPending(false)
    }
  }, [])

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Mon compte">
        <p className={styles.sidebarEyebrow}>
          <Link href="/profil" className={styles.sidebarEyebrowLink}>
            Mon compte
          </Link>
        </p>
        <nav className={styles.nav}>
          <ul className={styles.navList}>
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname)
              const badge =
                item.id === 'commandes' && orderBadge > 0 ? (
                  <span className={styles.navBadge} aria-hidden>
                    {orderBadge > 9 ? '9+' : orderBadge}
                  </span>
                ) : null
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={[styles.navLink, active ? styles.navLinkActive : '']
                      .filter(Boolean)
                      .join(' ')}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className={styles.navLinkLabel}>{item.label}</span>
                    {badge}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <button
          type="button"
          className={styles.signOutBtn}
          disabled={pending}
          onClick={() => void signOut()}
        >
          Se déconnecter
        </button>

        <div className={styles.sidebarApp}>
          <ProfileAppStoreFrame compact />
        </div>
      </aside>

      <div
        className={[styles.content, centerContent ? styles.contentCentered : '']
          .filter(Boolean)
          .join(' ')}
      >
        {title ? (
          <header className={styles.contentHeader}>
            <h1 className={styles.contentTitle}>{title}</h1>
            {lead ? <p className={styles.contentLead}>{lead}</p> : null}
          </header>
        ) : null}
        <div className={styles.contentBody}>{children}</div>
      </div>
    </div>
  )
}

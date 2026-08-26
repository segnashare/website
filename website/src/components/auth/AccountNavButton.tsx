'use client'

import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {fetchOngoingPurchaseOrderCount} from '@/lib/orders/fetch-ongoing-purchase-count'
import {
  getWebsiteOrderBadgeCount,
  setWebsiteOrderBadgeCount,
  subscribeWebsiteOrderBadge,
} from '@/lib/orders/website-order-badge'
import {useRouter} from 'next/navigation'
import {useCallback, useEffect, useId, useRef, useState} from 'react'
import styles from './accountNavButton.module.css'

type Props = {
  className?: string
  tone?: 'auto' | 'light' | 'dark'
}

function ProfileIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5.5 19.25c1.4-3.1 3.7-4.5 6.5-4.5s5.1 1.4 6.5 4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function OrdersIcon() {
  return (
    <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 7h10l1.2 12.2a1 1 0 0 1-1 1.1H6.8a1 1 0 0 1-1-1.1L7 7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 7V5.8A3 3 0 0 1 12 2.8 3 3 0 0 1 15 5.8V7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SecurityIcon() {
  return (
    <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.5 5.5 6.2v5.1c0 4.1 2.7 7.4 6.5 8.7 3.8-1.3 6.5-4.6 6.5-8.7V6.2L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10.2 12.1 11.5 13.4 14.2 10.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SubscriptionIcon() {
  return (
    <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4.5"
        y="6.5"
        width="15"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8 10.5h8M8 13.5h5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function formatMemberName(firstName?: string | null, lastName?: string | null): string {
  const parts = [firstName, lastName]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean)
  return parts.join(' ')
}

export function AccountNavButton({className, tone = 'auto'}: Props) {
  const router = useRouter()
  const panelId = useId()
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [memberName, setMemberName] = useState('')
  const [open, setOpen] = useState(false)
  const [orderBadge, setOrderBadge] = useState(0)

  useEffect(() => {
    const sync = () => setOrderBadge(getWebsiteOrderBadgeCount())
    sync()
    return subscribeWebsiteOrderBadge(sync)
  }, [])

  const refreshOrderBadge = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setWebsiteOrderBadgeCount(0)
      return
    }
    try {
      const supabase = createSupabaseBrowserClient()
      const count = await fetchOngoingPurchaseOrderCount(supabase, userId)
      setWebsiteOrderBadgeCount(count)
    } catch {
      // garde le cache
    }
  }, [])

  const loadMember = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setIsLoggedIn(false)
      setMemberName('')
      setWebsiteOrderBadgeCount(0)
      return
    }
    setIsLoggedIn(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const {data} = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', userId)
        .maybeSingle()
      const row = data as {first_name?: string | null; last_name?: string | null} | null
      setMemberName(formatMemberName(row?.first_name, row?.last_name))
    } catch {
      setMemberName('')
    }
    void refreshOrderBadge(userId)
  }, [refreshOrderBadge])

  useEffect(() => {
    let cancelled = false
    const supabase = createSupabaseBrowserClient()

    void (async () => {
      try {
        const {
          data: {user},
        } = await supabase.auth.getUser()
        if (cancelled) return
        await loadMember(user?.id)
      } catch {
        if (!cancelled) {
          setIsLoggedIn(false)
          setMemberName('')
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()

    const {
      data: {subscription},
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadMember(session?.user?.id)
      setReady(true)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [loadMember])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPointer = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [open])

  const go = useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router],
  )

  const onTriggerClick = useCallback(() => {
    if (!ready) return
    if (!isLoggedIn) {
      router.push(`/signin?next=${encodeURIComponent('/profil')}`)
      return
    }
    // Mobile : aller directement sur /profil (plus fiable que la modale dans le header étroit).
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1200px)').matches) {
      router.push('/profil')
      return
    }
    setOpen((v) => !v)
  }, [ready, isLoggedIn, router])

  const triggerClass = [
    styles.trigger,
    tone === 'light' ? styles.toneLight : '',
    tone === 'dark' ? styles.toneDark : '',
  ]
    .filter(Boolean)
    .join(' ')

  /* Même règle desktop / mobile : icône visible uniquement connecté. */
  if (!ready || !isLoggedIn) return null

  return (
    <>
      {open ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Fermer le menu compte"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <div className={[styles.wrap, className].filter(Boolean).join(' ')} ref={wrapRef}>
        <button
          type="button"
          className={triggerClass}
          aria-label={
            memberName
              ? orderBadge > 0
                ? `Compte — ${memberName}, ${orderBadge} commande${orderBadge > 1 ? 's' : ''} à voir`
                : `Compte — ${memberName}`
              : orderBadge > 0
                ? `Profil, ${orderBadge} commande${orderBadge > 1 ? 's' : ''} à voir`
                : 'Profil'
          }
          aria-haspopup={isLoggedIn ? 'dialog' : undefined}
          aria-expanded={isLoggedIn ? open : undefined}
          aria-controls={isLoggedIn ? panelId : undefined}
          onClick={onTriggerClick}
        >
          <ProfileIcon />
          {isLoggedIn && orderBadge > 0 ? (
            <span className={`${styles.badge} ${tone === 'light' ? styles.badgeOnDark : ''}`} aria-hidden>
              {orderBadge > 9 ? '9+' : orderBadge}
            </span>
          ) : null}
        </button>

        {open && isLoggedIn ? (
          <div
            id={panelId}
            className={styles.panel}
            role="dialog"
            aria-label={memberName || 'Compte'}
          >
            <p className={styles.panelTitle}>{memberName || 'Compte'}</p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => go('/profil/abonnement')}
              >
                <SubscriptionIcon />
                Abonnement
              </button>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => go('/profil/commandes')}
              >
                <OrdersIcon />
                <span className={styles.actionLabel}>Mes commandes</span>
                {orderBadge > 0 ? (
                  <span className={styles.actionBadge} aria-hidden>
                    {orderBadge > 9 ? '9+' : orderBadge}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => go('/profil/details')}
              >
                <SecurityIcon />
                Détails et sécurité
              </button>
            </div>
            <div className={styles.panelFooter}>
              <button
                type="button"
                className={styles.accountCta}
                onClick={() => go('/profil')}
              >
                Mon compte
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}

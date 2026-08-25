'use client'

import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
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

function AccountIcon() {
  return (
    <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5.8 19c1.3-2.8 3.4-4.1 6.2-4.1s4.9 1.3 6.2 4.1"
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
  const [pending, setPending] = useState(false)

  const loadMember = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setIsLoggedIn(false)
      setMemberName('')
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
  }, [])

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

  const signOut = useCallback(async () => {
    setPending(true)
    try {
      const supabase = createSupabaseBrowserClient()
      await supabase.auth.signOut()
      setIsLoggedIn(false)
      setMemberName('')
      setOpen(false)
      window.location.assign('/')
    } catch {
      setPending(false)
    }
  }, [])

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
          aria-label={memberName ? `Compte — ${memberName}` : 'Profil'}
          aria-haspopup={isLoggedIn ? 'dialog' : undefined}
          aria-expanded={isLoggedIn ? open : undefined}
          aria-controls={isLoggedIn ? panelId : undefined}
          onClick={onTriggerClick}
        >
          <ProfileIcon />
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
                disabled={pending}
                onClick={() => {
                  setOpen(false)
                  router.push('/profil')
                }}
              >
                <AccountIcon />
                Mon compte
              </button>
              <button
                type="button"
                className={styles.actionBtn}
                disabled={pending}
                onClick={() => {
                  setOpen(false)
                  router.push('/profil/commandes')
                }}
              >
                <OrdersIcon />
                Mes commandes
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                disabled={pending}
                onClick={() => void signOut()}
              >
                Se déconnecter
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}

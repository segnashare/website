'use client'

import {redirectToAppWithSession} from '@/lib/auth/app-handoff'
import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {useCallback, useEffect, useState} from 'react'
import styles from './profilePage.module.css'

type ProfileState = {
  firstName: string
  lastName: string
}

function formatMemberName(firstName: string, lastName: string): string {
  return [firstName, lastName].filter(Boolean).join(' ')
}

function ChevronIcon() {
  return (
    <svg className={styles.chevron} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M7.5 4.5 13 10l-5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function NavRow({
  label,
  disabled,
  onClick,
  href,
}: {
  label: string
  disabled?: boolean
  onClick?: () => void
  href?: string
}) {
  if (href) {
    return (
      <Link href={href} className={styles.row}>
        <span className={styles.rowLabel}>{label}</span>
        <ChevronIcon />
      </Link>
    )
  }

  return (
    <button type="button" className={styles.row} disabled={disabled} onClick={onClick}>
      <span className={styles.rowLabel}>{label}</span>
      <ChevronIcon />
    </button>
  )
}

export function ProfilePageClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [profile, setProfile] = useState<ProfileState | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const {
          data: {user},
        } = await supabase.auth.getUser()
        if (!user) {
          router.replace(`/signin?next=${encodeURIComponent('/profil')}`)
          return
        }

        const {data: member} = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', user.id)
          .maybeSingle()

        if (cancelled) return

        const m = member as {first_name?: string | null; last_name?: string | null} | null
        setProfile({
          firstName: typeof m?.first_name === 'string' ? m.first_name.trim() : '',
          lastName: typeof m?.last_name === 'string' ? m.last_name.trim() : '',
        })
      } catch {
        if (!cancelled) router.replace(`/signin?next=${encodeURIComponent('/profil')}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  const goApp = useCallback(async (path: string) => {
    setPending(true)
    try {
      await redirectToAppWithSession(path)
    } finally {
      setPending(false)
    }
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

  if (loading || !profile) {
    return <WebsitePageLoading label="Chargement du profil" />
  }

  const displayName = formatMemberName(profile.firstName, profile.lastName)

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>{displayName || 'Mon profil'}</h1>
      </header>

      <section className={styles.section} aria-label="Mon compte">
        <ul className={styles.list}>
          <li>
            <NavRow label="Commandes & retours" href="/profil/commandes" />
          </li>
          <li>
            <NavRow
              label="Détails et sécurité"
              disabled={pending}
              onClick={() => void goApp('/profile/settings')}
            />
          </li>
          <li>
            <NavRow label="Préférences et communications" href="/profil/preferences" />
          </li>
          <li>
            <NavRow
              label="Parrainer un ami"
              disabled={pending}
              onClick={() => void goApp('/profile?tab=plus')}
            />
          </li>
        </ul>
      </section>

      <div className={styles.footer}>
        <button type="button" className={styles.signOut} disabled={pending} onClick={() => void signOut()}>
          Se déconnecter
        </button>
      </div>
    </main>
  )
}

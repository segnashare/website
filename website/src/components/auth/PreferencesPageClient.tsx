'use client'

import {redirectToAppWithSession} from '@/lib/auth/app-handoff'
import {normalizeFrenchLocalNumber} from '@/lib/phone/fr-mobile'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {useCallback, useEffect, useState} from 'react'
import styles from './preferencesPage.module.css'

type PrefsState = {
  phoneDisplay: string
  phoneVerified: boolean
  email: string
  emailVerified: boolean
}

function formatPhoneDisplay(e164: string): string {
  const d = e164.replace(/\D/g, '')
  if (d.startsWith('33') && d.length >= 11) {
    const national = d.slice(2)
    if (national.length === 9) return `+33 0${national}`
    return `+33 ${national}`
  }
  const local = normalizeFrenchLocalNumber(e164)
  return local ? `+33 0${local}` : e164.trim()
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

function VerifiedBadge() {
  return (
    <span className={styles.verified} title="Vérifié" aria-label="Vérifié">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5 12.5 10 17.5 19 7.5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function NavRow({
  title,
  subtitle,
  disabled,
  onClick,
}: {
  title: string
  subtitle: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button type="button" className={styles.row} disabled={disabled} onClick={onClick}>
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{title}</span>
        <span className={styles.rowSubtitle}>{subtitle}</span>
      </span>
      <ChevronIcon />
    </button>
  )
}

export function PreferencesPageClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [prefs, setPrefs] = useState<PrefsState | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const {
          data: {user},
        } = await supabase.auth.getUser()
        if (!user) {
          router.replace(`/signin?next=${encodeURIComponent('/profil/preferences')}`)
          return
        }

        const [{data: member}, {data: profileRow}] = await Promise.all([
          supabase.from('users').select('phone,email').eq('id', user.id).maybeSingle(),
          supabase.from('user_profiles').select('profile_data').eq('user_id', user.id).maybeSingle(),
        ])

        if (cancelled) return

        const m = member as {phone?: string | null; email?: string | null} | null
        const profileData = ((profileRow as {profile_data?: Record<string, unknown> | null} | null)
          ?.profile_data ?? {}) as Record<string, unknown>
        const profilePhone =
          typeof profileData.phone_e164 === 'string' ? profileData.phone_e164.trim() : ''
        const usersPhone = typeof m?.phone === 'string' ? m.phone.trim() : ''
        const authPhone = typeof user.phone === 'string' ? user.phone.trim() : ''
        const phoneCodeVerified = profileData.phone_code_verified === true
        const phoneConfirmed = Boolean(user.phone_confirmed_at) || phoneCodeVerified
        const rawPhone = (phoneConfirmed && (usersPhone || profilePhone || authPhone)) || profilePhone || usersPhone || authPhone
        const email =
          (typeof m?.email === 'string' && m.email.trim()) || user.email?.trim() || ''

        setPrefs({
          phoneDisplay: rawPhone ? formatPhoneDisplay(rawPhone) : '',
          phoneVerified: phoneConfirmed && Boolean(rawPhone),
          email,
          emailVerified: Boolean(user.email_confirmed_at),
        })
      } catch {
        if (!cancelled) router.replace(`/signin?next=${encodeURIComponent('/profil/preferences')}`)
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

  if (loading || !prefs) {
    return <WebsitePageLoading label="Chargement des préférences" />
  }

  return (
    <main className={styles.main}>
      <Link href="/profil" className={styles.back}>
        ← Profil
      </Link>
      <h1 className={styles.title}>Préférences et communications</h1>

      <section className={styles.section} aria-labelledby="prefs-notifications">
        <h2 id="prefs-notifications" className={styles.sectionTitle}>
          Notifications
        </h2>
        <ul className={styles.list}>
          <li>
            <NavRow
              title="SMS"
              subtitle="Commandes toujours · offres & actus au choix."
              disabled={pending}
              onClick={() => void goApp('/profile/notifications/sms')}
            />
          </li>
          <li>
            <NavRow
              title="E-mail"
              subtitle="Transactionnels toujours · marketing au choix."
              disabled={pending}
              onClick={() => void goApp('/profile/notifications/email')}
            />
          </li>
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="prefs-contact">
        <h2 id="prefs-contact" className={styles.sectionTitle}>
          Téléphone & e-mail
        </h2>
        <div className={styles.contactRow}>
          <span className={styles.contactValue}>
            {prefs.phoneDisplay || <span className={styles.muted}>Aucun numéro</span>}
          </span>
          {prefs.phoneVerified ? <VerifiedBadge /> : null}
        </div>
        <div className={styles.contactRow}>
          <span className={styles.contactValue}>
            {prefs.email || <span className={styles.muted}>Aucun e-mail</span>}
          </span>
          {prefs.emailVerified ? <VerifiedBadge /> : null}
          <button
            type="button"
            className={styles.editBtn}
            disabled={pending}
            onClick={() => void goApp('/profile/edit-contact')}
          >
            Modifier
          </button>
        </div>
      </section>
    </main>
  )
}

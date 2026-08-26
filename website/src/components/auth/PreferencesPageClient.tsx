'use client'

import {AccountSectionShell} from '@/components/auth/AccountSectionShell'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import {useRouter} from 'next/navigation'
import {useCallback, useEffect, useState} from 'react'
import styles from './preferencesPage.module.css'

const LANGUAGE_OPTIONS = [{value: 'fr', label: 'Français'}] as const

type RpcUntyped = (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{data?: unknown; error?: {message?: string} | null}>

export function PreferencesPageClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [language, setLanguage] = useState<(typeof LANGUAGE_OPTIONS)[number]['value']>('fr')
  const [feedback, setFeedback] = useState<{kind: 'ok' | 'err'; text: string} | null>(null)

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
        if (!cancelled) setLanguage('fr')
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

  const save = useCallback(async () => {
    if (pending) return
    setFeedback(null)
    setPending(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const rpc = supabase.rpc.bind(supabase) as unknown as RpcUntyped
      const result = await rpc('update_user_profile_public', {
        p_profile_json: {
          profile_data: {
            email_language: language,
            locale: language,
          },
        },
        p_request_id: crypto.randomUUID(),
      })
      if (result.error) {
        setFeedback({
          kind: 'err',
          text: result.error.message ?? 'Impossible d’enregistrer les préférences.',
        })
        return
      }
      setFeedback({kind: 'ok', text: 'Préférences enregistrées.'})
    } catch {
      setFeedback({kind: 'err', text: 'Impossible d’enregistrer les préférences.'})
    } finally {
      setPending(false)
    }
  }, [language, pending])

  if (loading) {
    return <WebsitePageLoading label="Chargement des préférences" />
  }

  return (
    <AccountSectionShell
      title="Préférences de communication"
      lead="Gérer la langue de vos e-mails Segna."
    >
      <div className={styles.embedded}>
        <section className={styles.section} aria-labelledby="prefs-language">
          <h2 id="prefs-language" className={styles.sectionTitle}>
            Langue
          </h2>
          <p className={styles.sectionLead}>
            Sélectionnez la langue de votre choix pour les e-mails Segna.
          </p>
          <label className={styles.field}>
            <span className={styles.srOnly}>Langue</span>
            <select
              className={styles.select}
              value={language}
              onChange={(e) =>
                setLanguage(e.target.value as (typeof LANGUAGE_OPTIONS)[number]['value'])
              }
              disabled={pending}
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.saveBtn}
            disabled={pending}
            onClick={() => void save()}
          >
            {pending ? 'Enregistrement…' : 'Sauvegarder mes préférences'}
          </button>
        </div>

        {feedback ? (
          <p
            className={`${styles.feedback} ${feedback.kind === 'ok' ? styles.feedbackOk : styles.feedbackErr}`}
            role="status"
          >
            {feedback.text}
          </p>
        ) : null}
      </div>
    </AccountSectionShell>
  )
}

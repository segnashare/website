'use client'

import {CheckoutSignupOnboardingModal} from '@/components/auth/CheckoutSignupOnboardingModal'
import type {CheckoutOnboardingStep} from '@/lib/auth/checkout-onboarding-resume'
import {resolveCheckoutOnboardingResume} from '@/lib/auth/checkout-onboarding-resume'
import {WEBSITE_SUBSCRIPTION_RECAP_PATH} from '@/lib/cart/paths'
import {SEGNAX_COMPARE_ROWS} from '@/lib/subscription/segnax-compare'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {useCallback, useEffect, useRef, useState} from 'react'
import styles from './subscriptionRecap.module.css'

export function SubscriptionRecapClient() {
  const router = useRouter()
  const resumeHandledRef = useRef(false)
  const [pending, setPending] = useState(false)
  const [activatedNote, setActivatedNote] = useState(false)
  const [onboardingEmail, setOnboardingEmail] = useState<string | null>(null)
  const [onboardingInitialStep, setOnboardingInitialStep] = useState<CheckoutOnboardingStep>(1)

  useEffect(() => {
    if (resumeHandledRef.current) return
    resumeHandledRef.current = true

    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const resume = await resolveCheckoutOnboardingResume(supabase)
        if (resume.status === 'resume') {
          setOnboardingInitialStep(resume.step)
          setOnboardingEmail(resume.email)
        }
      } catch {
        // rester sur le récap
      }
    })()
  }, [])

  const handleActivate = useCallback(async () => {
    if (pending) return
    setPending(true)
    setActivatedNote(false)
    try {
      const supabase = createSupabaseBrowserClient()
      const resume = await resolveCheckoutOnboardingResume(supabase)
      if (resume.status === 'need_auth') {
        router.replace(`/signup?next=${encodeURIComponent(WEBSITE_SUBSCRIPTION_RECAP_PATH)}`)
        return
      }
      if (resume.status === 'resume') {
        setOnboardingInitialStep(resume.step)
        setOnboardingEmail(resume.email)
        return
      }
      // Stripe checkout abonnement — à brancher (Phase C).
      setActivatedNote(true)
    } catch {
      setActivatedNote(true)
    } finally {
      setPending(false)
    }
  }, [pending, router])

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Link href="/" className={styles.brand} aria-label="Accueil Segna">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/segna-logo.svg" alt="Segna" className={styles.brandLogo} width={120} height={36} />
        </Link>

        <h1 className={styles.title}>Votre mois offert est prêt</h1>
        <p className={styles.lead}>Vous allez activer votre abonnement Segna.</p>
        <p className={styles.price}>Le premier mois est offert, puis 39,99&nbsp;€/mois.</p>

        <section aria-labelledby="recap-compare">
          <h2 id="recap-compare" className={styles.compareTitle}>
            Guest vs SegnaX
          </h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col"> </th>
                  <th scope="col">Guest</th>
                  <th scope="col">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/brand/segnaX_logo_blanc.png"
                      alt="SegnaX"
                      className={styles.memberLogo}
                      width={96}
                      height={31}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {SEGNAX_COMPARE_ROWS.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{row.guest}</td>
                    <td className={styles.memberCell}>{row.member}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className={styles.cancelNote}>Annulation possible avant le renouvellement.</p>

        <button type="button" className={styles.cta} disabled={pending} onClick={handleActivate}>
          {pending ? 'Préparation…' : 'Activer mon mois offert'}
        </button>

        {activatedNote ? (
          <p className={styles.status} role="status">
            Prochaine étape&nbsp;: paiement Stripe pour activer SegnaX. Le checkout abonnement arrive bientôt&nbsp;;
            tu pourras ensuite composer ta box.
          </p>
        ) : null}
      </main>

      <CheckoutSignupOnboardingModal
        open={Boolean(onboardingEmail)}
        email={onboardingEmail ?? ''}
        intent="signup"
        initialStep={onboardingInitialStep}
        onClose={() => {
          setOnboardingEmail(null)
          setOnboardingInitialStep(1)
        }}
        onComplete={() => {
          setOnboardingEmail(null)
          setOnboardingInitialStep(1)
        }}
      />
    </div>
  )
}

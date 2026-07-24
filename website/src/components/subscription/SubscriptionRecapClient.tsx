'use client'

import {CheckoutSignupOnboardingModal} from '@/components/auth/CheckoutSignupOnboardingModal'
import type {CheckoutOnboardingStep} from '@/lib/auth/checkout-onboarding-resume'
import {resolveCheckoutOnboardingResume} from '@/lib/auth/checkout-onboarding-resume'
import {WEBSITE_SUBSCRIPTION_RECAP_PATH} from '@/lib/cart/paths'
import type {RecapWallItem} from '@/lib/subscription/recap-wall-types'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {useRouter} from 'next/navigation'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import styles from './subscriptionRecap.module.css'

const BENEFITS = [
  '1 mois pour commencer',
  'Pressing inclus',
  'Assurance incluse',
  '1 échange inclus par mois',
  '30% de réduction sur l’achat des pièces',
] as const

type Props = {
  wallItems: RecapWallItem[]
}

function splitIntoColumns(items: RecapWallItem[], columnCount: number): RecapWallItem[][] {
  const columns: RecapWallItem[][] = Array.from({length: columnCount}, () => [])
  items.forEach((item, index) => {
    columns[index % columnCount]!.push(item)
  })
  return columns
}

function WallColumn({items, ariaHidden}: {items: RecapWallItem[]; ariaHidden?: boolean}) {
  const loop = items.length > 0 ? [...items, ...items] : []
  return (
    <div className={styles.column} aria-hidden={ariaHidden || undefined}>
      <div className={styles.columnTrack}>
        {loop.map((item, index) => (
          <div key={`${item.id}-${index}`} className={styles.card}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.coverUrl} alt="" className={styles.cardImg} loading="lazy" decoding="async" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SubscriptionRecapClient({wallItems}: Props) {
  const router = useRouter()
  const resumeHandledRef = useRef(false)
  const [pending, setPending] = useState(false)
  const [activatedNote, setActivatedNote] = useState(false)
  const [onboardingEmail, setOnboardingEmail] = useState<string | null>(null)
  const [onboardingInitialStep, setOnboardingInitialStep] = useState<CheckoutOnboardingStep>(1)

  const columns = useMemo(() => splitIntoColumns(wallItems, 3), [wallItems])

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
      <div className={styles.shell}>
        <main className={styles.main}>
          <h1 className={styles.title}>Votre mois offert est prêt</h1>
          <p className={styles.lead}>
            Vous allez pouvoir commencer à louer vos prochaines pièces avec Segna dès aujourd’hui.
          </p>

          <div className={styles.priceGrid}>
            <div>
              <p className={styles.priceLabel}>Aujourd’hui</p>
              <p className={styles.priceValue}>Mois offert</p>
            </div>
            <div>
              <p className={styles.priceLabel}>Ensuite</p>
              <p className={styles.priceValue}>39,99&nbsp;€/mois</p>
            </div>
          </div>

          <p className={styles.benefitsIntro}>Avec SegnaX, vous profitez de&nbsp;:</p>
          <ul className={styles.benefits}>
            {BENEFITS.map((benefit) => (
              <li key={benefit} className={styles.benefit}>
                <span className={styles.check} aria-hidden>
                  ✓
                </span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

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

        {wallItems.length > 0 ? (
          <aside className={styles.wall} aria-hidden>
            <div className={styles.wallFadeTop} />
            <div className={styles.wallFadeBottom} />
            <div className={styles.wallStage}>
              {columns.map((columnItems, index) => (
                <WallColumn key={index} items={columnItems} ariaHidden />
              ))}
            </div>
          </aside>
        ) : null}
      </div>

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

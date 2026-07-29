'use client'

import {CheckoutAuthModal} from '@/components/auth/CheckoutAuthModal'
import {CheckoutSignupOnboardingModal} from '@/components/auth/CheckoutSignupOnboardingModal'
import {resolveCheckoutOnboardingResume} from '@/lib/auth/checkout-onboarding-resume'
import {
  catalogPurchasePriceCents,
  formatCatalogPurchasePriceLabel,
} from '@/lib/catalog/catalog-borrow-price-label'
import {formatCatalogCardSizeLabel} from '@/lib/catalog/format-catalog-card-size'
import {catalogItemAppHref, catalogItemPagePath} from '@/lib/catalog/catalog-app-links'
import {
  WEBSITE_CART_PATH,
  WEBSITE_CHECKOUT_PATH,
  WEBSITE_LOCATION_PATH,
} from '@/lib/cart/paths'
import {useWebsiteCart} from '@/lib/cart/use-website-cart'
import {
  WEBSITE_DEFAULT_SHIPPING_LABEL,
  WEBSITE_PURCHASE_FREE_SHIPPING_THRESHOLD_CENTS,
  websiteChronopostHomeOutboundTtcCents,
  websitePurchaseFreeShippingMissingCents,
  websitePurchaseFreeShippingProgressRatio,
} from '@/lib/cart/website-cart-shipping'
import {CartPaymentMethodsRow} from '@/components/cart/CartPaymentMethodsRow'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import styles from './cartPage.module.css'

const PURCHASE_CHECKOUT_HREF = `${WEBSITE_CHECKOUT_PATH}?mode=purchase`
const CART_AUTH_RETURN_PATH = `${WEBSITE_CART_PATH}?checkout=1`

function formatEuroSummary(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

export function CartPageClient() {
  const router = useRouter()
  const {items, count, removeItem} = useWebsiteCart()
  const [cartHydrated, setCartHydrated] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [onboardingEmail, setOnboardingEmail] = useState<string | null>(null)
  const [onboardingIntent, setOnboardingIntent] = useState<'signup' | 'signin'>('signup')
  const [checkoutPending, setCheckoutPending] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const checkoutHandledRef = useRef(false)

  useEffect(() => {
    setCartHydrated(true)
  }, [])

  useEffect(() => {
    if (!cartHydrated || count > 0) return
    router.replace('/catalogue')
  }, [cartHydrated, count, router])

  const goToPurchaseCheckout = useCallback(() => {
    setAuthOpen(false)
    setOnboardingEmail(null)
    setCheckoutPending(false)
    router.push(PURCHASE_CHECKOUT_HREF)
  }, [router])

  const handleFinalizePurchase = useCallback(async () => {
    if (checkoutPending) return
    setCheckoutPending(true)
    setAuthError(null)
    try {
      const supabase = createSupabaseBrowserClient()
      const resume = await resolveCheckoutOnboardingResume(supabase)
      if (resume.status === 'need_auth') {
        setAuthOpen(true)
        return
      }
      // E-mail pas encore confirmé → OTP uniquement, puis page checkout.
      if (resume.status === 'resume' && resume.step === 1) {
        setOnboardingIntent('signup')
        setOnboardingEmail(resume.email)
        return
      }
      // Profil incomplet OK : l’adresse se saisit sur la page checkout (pas de modale abo).
      goToPurchaseCheckout()
    } catch {
      setAuthOpen(true)
    } finally {
      setCheckoutPending(false)
    }
  }, [checkoutPending, goToPurchaseCheckout])

  useEffect(() => {
    if (typeof window === 'undefined' || count === 0) return
    const params = new URLSearchParams(window.location.search)
    const wantsCheckout = params.get('checkout') === '1'
    const oauthError = params.get('auth_error')
    if (!wantsCheckout && !oauthError) return
    if (checkoutHandledRef.current) return
    checkoutHandledRef.current = true

    if (oauthError) {
      setAuthError(oauthError)
      setAuthOpen(true)
    }

    const cleanUrl = () => {
      params.delete('checkout')
      params.delete('auth_error')
      const next = params.toString()
      const path = `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash}`
      window.history.replaceState(null, '', path)
    }

    void (async () => {
      try {
        if (wantsCheckout && !oauthError) {
          const supabase = createSupabaseBrowserClient()
          const resume = await resolveCheckoutOnboardingResume(supabase)
          if (resume.status === 'need_auth') setAuthOpen(true)
          else if (resume.status === 'resume' && resume.step === 1) {
            setOnboardingIntent('signup')
            setOnboardingEmail(resume.email)
          } else goToPurchaseCheckout()
        }
      } catch {
        if (wantsCheckout) setAuthOpen(true)
      } finally {
        cleanUrl()
      }
    })()
  }, [count, goToPurchaseCheckout])

  const subtotalCents = useMemo(
    () =>
      items.reduce((sum, item) => {
        if (typeof item.price_points !== 'number' || !Number.isFinite(item.price_points)) return sum
        return sum + catalogPurchasePriceCents(item.price_points)
      }, 0),
    [items],
  )

  const freeShippingUnlocked = subtotalCents >= WEBSITE_PURCHASE_FREE_SHIPPING_THRESHOLD_CENTS
  const shippingTtcCents = freeShippingUnlocked
    ? 0
    : websiteChronopostHomeOutboundTtcCents(count)
  const totalCents = subtotalCents + shippingTtcCents
  const freeShippingProgressPct = Math.round(
    websitePurchaseFreeShippingProgressRatio(subtotalCents) * 100,
  )
  const freeShippingMissingCents = websitePurchaseFreeShippingMissingCents(subtotalCents)

  if (!cartHydrated || count === 0) {
    return (
      <main className={styles.main}>
        <div className={styles.emptyState}>
          <p className={styles.emptyLead}>Redirection…</p>
        </div>
      </main>
    )
  }

  return (
    <>
    <main className={styles.main}>
        <div className={styles.layout}>
          <div className={styles.leftCol}>
            <section className={styles.card} aria-labelledby="cart-items-heading">
              <div className={styles.cardHeader}>
                <h2 id="cart-items-heading" className={styles.cardTitle}>
                  Votre panier ({count})
                </h2>
              </div>
              <ul className={styles.list}>
                {items.map((item) => {
                  const sizeLine = formatCatalogCardSizeLabel(item.size_label, item.size_code)
                  return (
                    <li key={item.id} className={styles.row}>
                      <Link href={catalogItemPagePath(item.id)} className={styles.thumbLink}>
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt="" className={styles.thumb} />
                        ) : (
                          <span className={styles.thumbFallback} aria-hidden />
                        )}
                      </Link>
                      <div className={styles.meta}>
                        <Link href={catalogItemPagePath(item.id)} className={styles.itemTitle}>
                          {item.title}
                        </Link>
                        {sizeLine ? <p className={styles.size}>{sizeLine}</p> : null}
                        <div className={styles.metaFooter}>
                          <button
                            type="button"
                            className={styles.remove}
                            onClick={() => removeItem(item.id)}
                            aria-label={`Retirer ${item.title}`}
                          >
                            Retirer
                          </button>
                          <p className={styles.rowPrice}>
                            {formatCatalogPurchasePriceLabel(item.price_points)}
                          </p>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>

            <Link href={WEBSITE_LOCATION_PATH} className={styles.segnaCard}>
              <span className={styles.segnaCardCopy}>
                <span className={styles.segnaCardTitle}>
                  Un accès premium et illimité
                  <span className={styles.segnaCardPrice}>
                    20&nbsp;€ le 1er mois, puis 39,99&nbsp;€/mois
                  </span>
                </span>
                <ul className={styles.segnaCardBullets}>
                  <li>Loue jusqu’à 400&nbsp;€ de pièces par mois</li>
                  <li>Frais d’expédition inclus</li>
                  <li>20&nbsp;% de réduction du prix d’achat sur tout le catalogue</li>
                </ul>
              </span>
              <span className={styles.segnaCardMedia}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/segnax-cart-promo.png"
                  alt=""
                  className={styles.segnaCardBg}
                  aria-hidden
                />
                <span className={styles.segnaCardCta}>
                  <span>Découvrir</span>
                  <strong>SegnaX</strong>
                </span>
              </span>
            </Link>
          </div>

          <aside className={styles.rightCol} aria-label="Finalisation de l’achat">
            <section className={styles.card} aria-labelledby="cart-purchase-heading">
              <h2 id="cart-purchase-heading" className={styles.cardTitle}>
                Résumé de votre commande
              </h2>
              <dl className={styles.summaryRows}>
                <div className={styles.summaryRow}>
                  <dt>
                    Sous-total{' '}
                    <span className={styles.summaryDetail}>
                      ({count} pièce{count > 1 ? 's' : ''})
                    </span>
                  </dt>
                  <dd>{formatEuroSummary(subtotalCents)}</dd>
                </div>
                <div className={styles.summaryRow}>
                  <dt>{WEBSITE_DEFAULT_SHIPPING_LABEL}</dt>
                  <dd className={freeShippingUnlocked ? styles.summaryMuted : undefined}>
                    {freeShippingUnlocked ? 'Offerte' : formatEuroSummary(shippingTtcCents)}
                  </dd>
                </div>
                <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                  <dt>Total</dt>
                  <dd>{formatEuroSummary(totalCents)}</dd>
                </div>
              </dl>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={checkoutPending}
                onClick={() => void handleFinalizePurchase()}
              >
                {checkoutPending ? 'Chargement…' : 'Finaliser mon achat'}
              </button>
              <CartPaymentMethodsRow />
            </section>

            <section className={styles.card} aria-label="Livraison et emballage">
              <ul className={styles.perkList}>
                <li className={styles.perkItem}>
                  <span className={styles.perkIcon} aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M3 7h11v10H3V7Zm11 3h4l3 3v4h-7v-7Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                      <circle cx="7.5" cy="18.5" r="1.5" fill="currentColor" />
                      <circle cx="17.5" cy="18.5" r="1.5" fill="currentColor" />
                    </svg>
                  </span>
                  <div className={styles.perkBody}>
                    <strong className={styles.perkTitle}>Livraison offerte</strong>
                    <span className={styles.perkText}>
                      {freeShippingUnlocked
                        ? `Débloquée dès ${WEBSITE_PURCHASE_FREE_SHIPPING_THRESHOLD_CENTS / 100}\u00A0€ d’achat.`
                        : `Plus que ${formatEuroSummary(freeShippingMissingCents)} pour la débloquer`}
                    </span>
                    <div
                      className={styles.shippingProgress}
                      role="progressbar"
                      aria-valuenow={freeShippingProgressPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Progression vers la livraison offerte : ${freeShippingProgressPct} pour cent`}
                    >
                      <div
                        className={styles.shippingProgressFill}
                        style={{width: `${freeShippingProgressPct}%`}}
                      />
                    </div>
                  </div>
                </li>
                <li className={styles.perkItem}>
                  <span className={styles.perkIcon} aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 3 4.5 6.5v5.2c0 4.4 3 8.2 7.5 9.3 4.5-1.1 7.5-4.9 7.5-9.3V6.5L12 3Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <div className={styles.perkBody}>
                    <strong className={styles.perkTitle}>Emballage sécurisé</strong>
                    <span className={styles.perkText}>Pièces protégées et assurées pour l’envoi</span>
                  </div>
                </li>
              </ul>
            </section>

            <a
              href={catalogItemAppHref(items[0]?.id)}
              className={styles.appPromo}
              target="_blank"
              rel="noopener noreferrer"
            >
              <p className={styles.appPromoTitle}>Découvrir Segna sur l’app</p>
              <p className={styles.appPromoSubtitle}>
                Louez vos pièces, renouvelez quand vous voulez, et profitez d’avantages à l’achat.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/app-store-badge.png"
                alt="Download on the App Store"
                className={styles.appPromoBadge}
                width={180}
                height={52}
                decoding="async"
              />
            </a>
          </aside>

        </div>
    </main>

    <CheckoutAuthModal
      open={authOpen}
      onClose={() => setAuthOpen(false)}
      onAuthenticated={goToPurchaseCheckout}
      onStartEmailOnboarding={(email, intent = 'signup') => {
        setAuthOpen(false)
        setOnboardingIntent(intent)
        setOnboardingEmail(email)
      }}
      returnPath={CART_AUTH_RETURN_PATH}
      initialAuthError={authError}
    />
    <CheckoutSignupOnboardingModal
      open={Boolean(onboardingEmail)}
      email={onboardingEmail ?? ''}
      intent={onboardingIntent}
      emailOtpOnly
      onClose={() => setOnboardingEmail(null)}
      onComplete={() => {
        setOnboardingEmail(null)
        goToPurchaseCheckout()
      }}
    />
    </>
  )
}

'use client'

import {
  isBanAddressSelectionValid,
  searchBanAddresses,
  type BanAddressSuggestion,
} from '@/lib/auth/ban-address-search'
import {savePurchaseCheckoutDelivery} from '@/lib/auth/checkout-onboarding-persist'
import {
  catalogPurchasePriceCents,
  formatCatalogPurchasePriceLabel,
} from '@/lib/catalog/catalog-borrow-price-label'
import {formatCatalogCardSizeLabel} from '@/lib/catalog/format-catalog-card-size'
import {WEBSITE_CART_PATH} from '@/lib/cart/paths'
import {useWebsiteCart} from '@/lib/cart/use-website-cart'
import {
  WEBSITE_PURCHASE_FREE_SHIPPING_THRESHOLD_CENTS,
  websiteChronopostHomeOutboundTtcCents,
} from '@/lib/cart/website-cart-shipping'
import {buildMapEmbedSrc, getDefaultMapCenter} from '@/lib/maps/google-maps-embed'
import {normalizeFrenchLocalNumber} from '@/lib/phone/fr-mobile'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {FormEvent, useEffect, useMemo, useState} from 'react'
import styles from './purchaseCheckout.module.css'

function formatEuroSummary(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

function parsePostcodeCity(suggestion: BanAddressSuggestion): {postcode: string; city: string} {
  const afterComma = suggestion.label.includes(',')
    ? suggestion.label.split(',').slice(1).join(',').trim()
    : suggestion.secondary
  const match = afterComma.match(/^(\d{5})\s+(.+)$/)
  if (match) return {postcode: match[1]!, city: match[2]!.trim()}
  return {postcode: '', city: suggestion.city ?? suggestion.relativeCity ?? ''}
}

export function PurchaseCheckoutClient() {
  const router = useRouter()
  const {items, count} = useWebsiteCart()

  const [bootstrapping, setBootstrapping] = useState(true)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [marketingOptOut, setMarketingOptOut] = useState(false)
  const [addressQuery, setAddressQuery] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [showAddressLine2, setShowAddressLine2] = useState(false)
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [postcode, setPostcode] = useState('')
  const [phoneLocal, setPhoneLocal] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<BanAddressSuggestion | null>(null)
  const [suggestions, setSuggestions] = useState<BanAddressSuggestion[]>([])
  const [locationLoading, setLocationLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [mapCenter, setMapCenter] = useState(getDefaultMapCenter)
  const [promoCode, setPromoCode] = useState('')
  const [promoNote, setPromoNote] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})

  const subtotalCents = useMemo(
    () =>
      items.reduce((sum, item) => {
        if (typeof item.price_points !== 'number' || !Number.isFinite(item.price_points)) return sum
        return sum + catalogPurchasePriceCents(item.price_points)
      }, 0),
    [items],
  )
  const freeShippingUnlocked = subtotalCents >= WEBSITE_PURCHASE_FREE_SHIPPING_THRESHOLD_CENTS
  const shippingTtcCents = freeShippingUnlocked ? 0 : websiteChronopostHomeOutboundTtcCents(count)
  const totalCents = subtotalCents + shippingTtcCents

  const addressValid = isBanAddressSelectionValid(addressQuery, selectedLocation)
  const mapSrc = buildMapEmbedSrc(mapCenter.lat, mapCenter.lon)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const {
          data: {user},
        } = await supabase.auth.getUser()
        if (cancelled) return
        if (!user?.email) {
          router.replace(`${WEBSITE_CART_PATH}?checkout=1`)
          return
        }
        setEmail(user.email)

        const {data: member} = await supabase
          .from('users')
          .select('first_name, last_name, adress, phone')
          .eq('id', user.id)
          .maybeSingle()
        if (cancelled) return
        const row = member as {
          first_name?: string | null
          last_name?: string | null
          adress?: string | null
          phone?: string | null
        } | null
        if (row?.first_name) setFirstName(row.first_name)
        if (row?.last_name) setLastName(row.last_name ?? '')
        if (row?.adress) {
          setAddressQuery(row.adress)
        }
        if (row?.phone) {
          const local = normalizeFrenchLocalNumber(row.phone)
          if (local) setPhoneLocal(`0${local}`)
        }
      } catch {
        router.replace(`${WEBSITE_CART_PATH}?checkout=1`)
        return
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (count === 0 && !bootstrapping) {
      router.replace(WEBSITE_CART_PATH)
    }
  }, [bootstrapping, count, router])

  useEffect(() => {
    const query = addressQuery.trim()
    if (query.length < 3 || (selectedLocation && query === selectedLocation.label)) {
      setSuggestions([])
      setActiveSuggestion(-1)
      setLocationLoading(false)
      return
    }
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setLocationLoading(true)
        try {
          const next = await searchBanAddresses(query, controller.signal)
          setSuggestions(next)
          setActiveSuggestion(next.length > 0 ? 0 : -1)
        } catch {
          setSuggestions([])
          setActiveSuggestion(-1)
        } finally {
          setLocationLoading(false)
        }
      })()
    }, 240)
    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [addressQuery, selectedLocation])

  function selectSuggestion(suggestion: BanAddressSuggestion) {
    setSelectedLocation(suggestion)
    setAddressQuery(suggestion.label)
    setSuggestions([])
    setShowSuggestions(false)
    setActiveSuggestion(-1)
    setMapCenter({lat: suggestion.lat, lon: suggestion.lon})
    const parsed = parsePostcodeCity(suggestion)
    setCity(parsed.city)
    setPostcode(parsed.postcode)
    setFieldErrors((prev) => ({...prev, address: false, city: false, postcode: false}))
  }

  function onPromoSubmit(event: FormEvent) {
    event.preventDefault()
    const code = promoCode.trim()
    if (!code) {
      setPromoNote(null)
      return
    }
    setPromoNote('Les codes promo seront appliqués au paiement.')
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    setError(null)

    const phoneDigits = normalizeFrenchLocalNumber(phoneLocal)
    const nextErrors = {
      firstName: firstName.trim().length < 2,
      lastName: lastName.trim().length < 1,
      email: !email.trim(),
      address: !addressValid,
      city: city.trim().length < 2,
      postcode: !/^\d{5}$/.test(postcode.trim()),
      phone: phoneDigits.length !== 9,
    }
    setFieldErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) {
      setError('Complète les champs obligatoires pour continuer.')
      return
    }

    setPending(true)
    setStatus(null)
    try {
      const supabase = createSupabaseBrowserClient()
      const result = await savePurchaseCheckoutDelivery(supabase, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneRaw: phoneLocal,
        addressLine2: showAddressLine2 ? addressLine2 : '',
        location: {
          label: selectedLocation!.label,
          relativeCity: selectedLocation!.relativeCity,
          timezone: selectedLocation!.timezone,
          lat: selectedLocation!.lat,
          lon: selectedLocation!.lon,
        },
      })
      if (!result.ok) {
        setError(result.message)
        return
      }
      // Paiement Stripe achat website : à brancher (proxy → app cart checkout).
      setStatus('Adresse enregistrée. Le paiement sécurisé arrive à l’étape suivante.')
    } catch {
      setError('Impossible d’enregistrer ta commande pour le moment.')
    } finally {
      setPending(false)
    }
  }

  if (bootstrapping || count === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <p>Chargement…</p>
        </div>
      </div>
    )
  }

  const canPay =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 1 &&
    addressValid &&
    city.trim().length >= 2 &&
    /^\d{5}$/.test(postcode.trim()) &&
    normalizeFrenchLocalNumber(phoneLocal).length === 9

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.secure}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M7 11V8a5 5 0 0 1 10 0v3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          Paiement sécurisé
        </span>
        <Link href="/" className={styles.logo}>
          Segna
        </Link>
        <p className={styles.help}>
          Besoin d&apos;aide&nbsp;?{' '}
          <a href="mailto:hello@segna.fr">hello@segna.fr</a>
        </p>
      </header>

      <div className={styles.layout}>
        <section className={styles.formCol} aria-labelledby="delivery-heading">
          <h1 id="delivery-heading" className={styles.title}>
            Adresse de livraison
          </h1>
          <p className={styles.subtitle}>Ajouter votre adresse de livraison</p>

          <form
            id="purchase-checkout-form"
            className={styles.form}
            onSubmit={(e) => void onSubmit(e)}
            noValidate
          >
            <div className={styles.row2}>
              <label className={styles.field}>
                <span className={styles.label}>Prénom *</span>
                <input
                  className={`${styles.input} ${fieldErrors.firstName ? styles.inputError : ''}`}
                  value={firstName}
                  autoComplete="given-name"
                  onChange={(e) => {
                    setFirstName(e.target.value)
                    setFieldErrors((p) => ({...p, firstName: false}))
                  }}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Nom *</span>
                <input
                  className={`${styles.input} ${fieldErrors.lastName ? styles.inputError : ''}`}
                  value={lastName}
                  autoComplete="family-name"
                  onChange={(e) => {
                    setLastName(e.target.value)
                    setFieldErrors((p) => ({...p, lastName: false}))
                  }}
                />
              </label>
            </div>

            <label className={styles.field}>
              <span className={styles.label}>Adresse e-mail *</span>
              <input
                className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`}
                type="email"
                value={email}
                autoComplete="email"
                readOnly
              />
            </label>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={marketingOptOut}
                onChange={(e) => setMarketingOptOut(e.target.checked)}
              />
              <span>
                Nous vous informerons des promotions, nouveautés et des mises à jour de stock. Cochez
                la case pour vous désinscrire.
              </span>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Pays/Territoire *</span>
              <select className={styles.select} value="FR" disabled>
                <option value="FR">France (EUR €)</option>
              </select>
            </label>

            <div className={styles.field}>
              <span className={styles.label}>Adresse *</span>
              <div className={styles.addressWrap}>
                <input
                  className={`${styles.input} ${fieldErrors.address ? styles.inputError : ''}`}
                  value={addressQuery}
                  autoComplete="street-address"
                  placeholder="Saisissez le début de votre adresse pour afficher les résultats"
                  aria-autocomplete="list"
                  aria-expanded={showSuggestions}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    window.setTimeout(() => setShowSuggestions(false), 140)
                  }}
                  onChange={(e) => {
                    setAddressQuery(e.target.value)
                    setSelectedLocation(null)
                    setShowSuggestions(true)
                    setFieldErrors((p) => ({...p, address: false}))
                  }}
                  onKeyDown={(e) => {
                    if (!showSuggestions || suggestions.length === 0) return
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      setActiveSuggestion((prev) =>
                        prev < 0 ? 0 : Math.min(prev + 1, suggestions.length - 1),
                      )
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      setActiveSuggestion((prev) => (prev <= 0 ? 0 : prev - 1))
                    } else if (
                      e.key === 'Enter' &&
                      activeSuggestion >= 0 &&
                      activeSuggestion < suggestions.length
                    ) {
                      e.preventDefault()
                      selectSuggestion(suggestions[activeSuggestion]!)
                    }
                  }}
                />
                {showSuggestions && (locationLoading || suggestions.length > 0) ? (
                  <div className={styles.suggestions} role="listbox" aria-label="Suggestions d’adresse">
                    {locationLoading ? (
                      <p className={styles.hint}>Recherche d’adresses…</p>
                    ) : (
                      suggestions.map((suggestion, index) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          role="option"
                          aria-selected={index === activeSuggestion}
                          className={`${styles.suggestion} ${
                            index === activeSuggestion ? styles.suggestionActive : ''
                          }`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectSuggestion(suggestion)}
                        >
                          <span className={styles.suggestionLabel}>{suggestion.label}</span>
                          {suggestion.secondary ? (
                            <span className={styles.suggestionSecondary}>{suggestion.secondary}</span>
                          ) : null}
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {showAddressLine2 ? (
              <label className={styles.field}>
                <span className={styles.label}>Complément d’adresse</span>
                <input
                  className={styles.input}
                  value={addressLine2}
                  autoComplete="address-line2"
                  placeholder="Appartement, étage, bâtiment…"
                  onChange={(e) => setAddressLine2(e.target.value)}
                />
              </label>
            ) : (
              <button
                type="button"
                className={styles.addLineBtn}
                onClick={() => setShowAddressLine2(true)}
              >
                Ajouter une autre ligne
              </button>
            )}

            <div className={styles.mapBlock}>
              <iframe
                title="Carte de localisation"
                src={mapSrc}
                className={styles.mapFrame}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>

            <div className={styles.rowCityZip}>
              <label className={styles.field}>
                <span className={styles.label}>Ville *</span>
                <input
                  className={`${styles.input} ${fieldErrors.city ? styles.inputError : ''}`}
                  value={city}
                  autoComplete="address-level2"
                  onChange={(e) => {
                    setCity(e.target.value)
                    setFieldErrors((p) => ({...p, city: false}))
                  }}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Province/État</span>
                <input
                  className={styles.input}
                  value={region}
                  autoComplete="address-level1"
                  onChange={(e) => setRegion(e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Code postal *</span>
                <input
                  className={`${styles.input} ${fieldErrors.postcode ? styles.inputError : ''}`}
                  value={postcode}
                  autoComplete="postal-code"
                  inputMode="numeric"
                  onChange={(e) => {
                    setPostcode(e.target.value.replace(/\D/g, '').slice(0, 5))
                    setFieldErrors((p) => ({...p, postcode: false}))
                  }}
                />
              </label>
            </div>

            <label className={styles.field}>
              <span className={styles.label}>Téléphone *</span>
              <div className={styles.phoneRow}>
                <span className={styles.phonePrefix} aria-hidden>
                  🇫🇷 +33
                </span>
                <input
                  className={`${styles.input} ${fieldErrors.phone ? styles.inputError : ''}`}
                  value={phoneLocal}
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="6 12 34 56 78"
                  onChange={(e) => {
                    setPhoneLocal(e.target.value)
                    setFieldErrors((p) => ({...p, phone: false}))
                  }}
                />
              </div>
            </label>

            {error ? <p className={styles.formError}>{error}</p> : null}
            {status ? <p className={styles.statusOk}>{status}</p> : null}

            <Link href={WEBSITE_CART_PATH} className={styles.backLink}>
              ← Retour au panier
            </Link>
          </form>
        </section>

        <aside className={styles.summaryCol} aria-label="Récapitulatif de commande">
          <div className={styles.summaryTotalTop}>
            <span>Total</span>
            <span>{formatEuroSummary(totalCents)}</span>
          </div>

          <button
            type="submit"
            form="purchase-checkout-form"
            className={styles.payBtn}
            disabled={!canPay || pending}
          >
            {pending ? 'Enregistrement…' : 'Passer la commande'}
          </button>

          <p className={styles.legal}>
            En passant commande, vous acceptez les{' '}
            <Link href="/cgv">Conditions générales</Link> et la{' '}
            <Link href="/confidentialite">Politique de confidentialité</Link> de Segna.
          </p>

          <h2 className={styles.recapTitle}>Récapitulatif</h2>
          <ul className={styles.itemList}>
            {items.map((item) => {
              const sizeLine = formatCatalogCardSizeLabel(item.size_label, item.size_code)
              return (
                <li key={item.id} className={styles.itemRow}>
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className={styles.thumb} />
                  ) : (
                    <span className={styles.thumbFallback} aria-hidden />
                  )}
                  <div className={styles.itemMeta}>
                    {item.brand_label ? <p className={styles.brand}>{item.brand_label}</p> : null}
                    <p className={styles.itemTitle}>{item.title}</p>
                    {sizeLine ? <p className={styles.size}>{sizeLine}</p> : null}
                  </div>
                  <p className={styles.itemPrice}>
                    {formatCatalogPurchasePriceLabel(item.price_points)}
                  </p>
                </li>
              )
            })}
          </ul>

          <div className={styles.summaryRows}>
            <div className={styles.summaryRow}>
              <span>Livraison</span>
              <span>
                {freeShippingUnlocked ? 'Offerte' : formatEuroSummary(shippingTtcCents)}
              </span>
            </div>
            <div className={`${styles.summaryRow} ${styles.summaryRowTotal}`}>
              <span>Total</span>
              <span>{formatEuroSummary(totalCents)}</span>
            </div>
            <p className={styles.vatNote}>TVA incluse</p>
          </div>

          <div className={styles.promoBlock}>
            <span className={styles.label}>Code promo</span>
            <form className={styles.promoForm} onSubmit={onPromoSubmit}>
              <input
                className={styles.input}
                value={promoCode}
                placeholder="Saisissez votre code"
                onChange={(e) => setPromoCode(e.target.value)}
              />
              <button type="submit" className={styles.promoApply}>
                OK
              </button>
            </form>
            {promoNote ? <p className={styles.hint}>{promoNote}</p> : null}
          </div>

          <div className={styles.returns}>
            <span>Retours sous 30 jours</span>
            <span className={styles.freeTag}>Gratuit</span>
          </div>
        </aside>
      </div>
    </div>
  )
}

'use client'

import {
  isBanAddressSelectionValid,
  searchBanAddresses,
  type BanAddressSuggestion,
} from '@/lib/auth/ban-address-search'
import {getCheckoutPhoneState} from '@/lib/auth/checkout-phone'
import {savePurchaseCheckoutDelivery} from '@/lib/auth/checkout-onboarding-persist'
import {CartPaymentMethodsRow} from '@/components/cart/CartPaymentMethodsRow'
import {WebsitePageLoading} from '@/components/ui/WebsitePageLoading'
import {syncAndReserveWebsiteCartForCheckout} from '@/lib/cart/sync-website-cart-for-checkout'
import {
  catalogPurchasePriceCents,
  formatCatalogPurchasePriceLabel,
} from '@/lib/catalog/catalog-borrow-price-label'
import {formatCatalogCardSizeLabel} from '@/lib/catalog/format-catalog-card-size'
import {WEBSITE_CART_PATH} from '@/lib/cart/paths'
import {useWebsiteCart} from '@/lib/cart/use-website-cart'
import {trackWebsiteEvent} from '@/lib/analytics/track'
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

function streetFromSuggestion(suggestion: BanAddressSuggestion): string {
  if (suggestion.street?.trim()) return suggestion.street.trim()
  const beforeComma = suggestion.label.split(',')[0]?.trim()
  return beforeComma || suggestion.label
}

function parsePostcodeCity(suggestion: BanAddressSuggestion): {postcode: string; city: string} {
  if (suggestion.postcode || suggestion.city) {
    return {
      postcode: suggestion.postcode ?? '',
      city: suggestion.city ?? suggestion.relativeCity ?? '',
    }
  }
  const afterComma = suggestion.label.includes(',')
    ? suggestion.label.split(',').slice(1).join(',').trim()
    : suggestion.secondary
  const match = afterComma.match(/^(\d{5})\s+(.+)$/)
  if (match) return {postcode: match[1]!, city: match[2]!.trim()}
  return {postcode: '', city: suggestion.city ?? suggestion.relativeCity ?? ''}
}

/** Découpe un libellé profil BAN (« rue, CP ville » éventuellement + « — complément »). */
function parseStoredAddressLabel(raw: string): {
  street: string
  postcode: string
  city: string
  line2: string
} {
  const [mainPart, ...rest] = raw.split('—')
  const line2 = rest.join('—').trim()
  const main = (mainPart ?? raw).trim()
  const commaMatch = main.match(/^(.*?),\s*(\d{5})\s+(.+)$/)
  if (commaMatch) {
    return {
      street: commaMatch[1]!.trim(),
      postcode: commaMatch[2]!,
      city: commaMatch[3]!.trim(),
      line2,
    }
  }
  const postalMatch = main.match(/\b(\d{5})\b/)
  const postcode = postalMatch?.[1] ?? ''
  const street = main
    .replace(/\s*,\s*\d{5}\b.*$/i, '')
    .replace(/\s+\d{5}\b.*$/i, '')
    .trim()
  let city = ''
  if (postcode) {
    const after = main.split(postcode)[1]?.trim().replace(/^,\s*/, '') ?? ''
    city = after.replace(/,.*$/, '').trim()
  }
  return {street: street || main, postcode, city, line2}
}

/** N° TVA UE approximatif (ex. FR12345678901). */
function normalizeEuVat(value: string): string {
  return value.replace(/[\s.\-]/g, '').toUpperCase()
}

function isPlausibleEuVat(value: string): boolean {
  return /^[A-Z]{2}[A-Z0-9]{8,12}$/.test(normalizeEuVat(value))
}

const PURCHASE_BILLING_STORAGE_KEY = 'segna-purchase-billing'

export function PurchaseCheckoutClient() {
  const router = useRouter()
  const {items, count} = useWebsiteCart()

  const [bootstrapping, setBootstrapping] = useState(true)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
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
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true)
  const [billingIsCompany, setBillingIsCompany] = useState(false)
  const [billingCompanyName, setBillingCompanyName] = useState('')
  const [billingVat, setBillingVat] = useState('')
  const [billingFirstName, setBillingFirstName] = useState('')
  const [billingLastName, setBillingLastName] = useState('')
  const [billingStreet, setBillingStreet] = useState('')
  const [billingLine2, setBillingLine2] = useState('')
  const [billingCity, setBillingCity] = useState('')
  const [billingRegion, setBillingRegion] = useState('')
  const [billingPostcode, setBillingPostcode] = useState('')
  const [billingSelectedLocation, setBillingSelectedLocation] =
    useState<BanAddressSuggestion | null>(null)
  const [billingSuggestions, setBillingSuggestions] = useState<BanAddressSuggestion[]>([])
  const [billingLocationLoading, setBillingLocationLoading] = useState(false)
  const [showBillingSuggestions, setShowBillingSuggestions] = useState(false)
  const [billingActiveSuggestion, setBillingActiveSuggestion] = useState(-1)
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

  const addressPartsFilled =
    addressQuery.trim().length >= 2 &&
    city.trim().length >= 2 &&
    /^\d{5}$/.test(postcode.trim())
  const addressValid =
    addressPartsFilled &&
    (selectedLocation === null ||
      (selectedLocation.hasStreet &&
        (addressQuery.trim() === streetFromSuggestion(selectedLocation) ||
          isBanAddressSelectionValid(addressQuery, selectedLocation))))
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

        const [{data: member}, {data: profile}, phoneState] = await Promise.all([
          supabase
            .from('users')
            .select('first_name, last_name, adress')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('user_profiles')
            .select('city, profile_data')
            .eq('user_id', user.id)
            .maybeSingle(),
          getCheckoutPhoneState(supabase, user.id),
        ])
        if (cancelled) return

        const row = member as {
          first_name?: string | null
          last_name?: string | null
          adress?: string | null
        } | null
        const profileRow = profile as {
          city?: string | null
          profile_data?: Record<string, unknown> | null
        } | null
        const profileData = (profileRow?.profile_data ?? {}) as Record<string, unknown>
        const location = (profileData.location ?? {}) as Record<string, unknown>
        const locationLabel =
          (typeof location.label === 'string' && location.label.trim()) ||
          (row?.adress ?? '').trim()
        const cityHint =
          (typeof profileRow?.city === 'string' && profileRow.city.trim()) ||
          (typeof location.relative_city === 'string' && location.relative_city.trim()) ||
          ''

        if (row?.first_name) setFirstName(row.first_name)
        if (row?.last_name) setLastName(row.last_name ?? '')

        if (phoneState.pendingE164) {
          const local = normalizeFrenchLocalNumber(phoneState.pendingE164)
          if (local.length === 9) setPhoneLocal(`0${local}`)
        }

        if (locationLabel) {
          const parsed = parseStoredAddressLabel(locationLabel)
          setAddressQuery(parsed.street)
          if (parsed.postcode) setPostcode(parsed.postcode)
          if (parsed.city) setCity(parsed.city)
          else if (cityHint && !/arrondissement/i.test(cityHint)) setCity(cityHint)
          if (parsed.line2) {
            setAddressLine2(parsed.line2)
            setShowAddressLine2(true)
          }

          const lat = typeof location.lat === 'number' ? location.lat : null
          const lon = typeof location.lon === 'number' ? location.lon : null
          if (lat != null && lon != null) setMapCenter({lat, lon})

          try {
            const banHits = await searchBanAddresses(locationLabel)
            if (cancelled) return
            const match =
              banHits.find((s) => s.hasStreet && s.label === locationLabel) ||
              banHits.find(
                (s) =>
                  s.hasStreet &&
                  streetFromSuggestion(s).toLowerCase() === parsed.street.toLowerCase() &&
                  (s.postcode === parsed.postcode || !parsed.postcode),
              ) ||
              banHits.find((s) => s.hasStreet) ||
              null
            if (match) {
              setSelectedLocation(match)
              setAddressQuery(streetFromSuggestion(match))
              const parts = parsePostcodeCity(match)
              if (parts.city) setCity(parts.city)
              if (parts.postcode) setPostcode(parts.postcode)
              if (match.region) setRegion(match.region)
              setMapCenter({lat: match.lat, lon: match.lon})
            }
          } catch {
            // parsing local suffit si BAN indisponible
          }
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
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') !== 'cancelled') return
    setError('Paiement annulé. Tu peux relancer la commande quand tu veux.')
    params.delete('checkout')
    const next = params.toString()
    const path = `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash}`
    window.history.replaceState(null, '', path)
  }, [])

  useEffect(() => {
    const query = addressQuery.trim()
    const selectedStreet = selectedLocation ? streetFromSuggestion(selectedLocation) : null
    if (
      query.length < 3 ||
      (selectedLocation &&
        (query === selectedStreet || query === selectedLocation.label))
    ) {
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

  useEffect(() => {
    if (billingSameAsShipping) return
    const query = billingStreet.trim()
    const selectedStreet = billingSelectedLocation
      ? streetFromSuggestion(billingSelectedLocation)
      : null
    if (
      query.length < 3 ||
      (billingSelectedLocation &&
        (query === selectedStreet || query === billingSelectedLocation.label))
    ) {
      setBillingSuggestions([])
      setBillingActiveSuggestion(-1)
      setBillingLocationLoading(false)
      return
    }
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setBillingLocationLoading(true)
        try {
          const next = await searchBanAddresses(query, controller.signal)
          setBillingSuggestions(next)
          setBillingActiveSuggestion(next.length > 0 ? 0 : -1)
        } catch {
          setBillingSuggestions([])
          setBillingActiveSuggestion(-1)
        } finally {
          setBillingLocationLoading(false)
        }
      })()
    }, 240)
    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [billingStreet, billingSelectedLocation, billingSameAsShipping])

  function selectSuggestion(suggestion: BanAddressSuggestion) {
    setSelectedLocation(suggestion)
    setAddressQuery(streetFromSuggestion(suggestion))
    setSuggestions([])
    setShowSuggestions(false)
    setActiveSuggestion(-1)
    setMapCenter({lat: suggestion.lat, lon: suggestion.lon})
    const parsed = parsePostcodeCity(suggestion)
    setCity(parsed.city)
    setPostcode(parsed.postcode)
    setRegion(suggestion.region ?? '')
    setFieldErrors((prev) => ({...prev, address: false, city: false, postcode: false}))
  }

  function selectBillingSuggestion(suggestion: BanAddressSuggestion) {
    setBillingSelectedLocation(suggestion)
    setBillingStreet(streetFromSuggestion(suggestion))
    setBillingSuggestions([])
    setShowBillingSuggestions(false)
    setBillingActiveSuggestion(-1)
    const parsed = parsePostcodeCity(suggestion)
    setBillingCity(parsed.city)
    setBillingPostcode(parsed.postcode)
    setBillingRegion(suggestion.region ?? '')
    setFieldErrors((prev) => ({
      ...prev,
      billingStreet: false,
      billingCity: false,
      billingPostcode: false,
    }))
  }

  function openDistinctBillingAddress() {
    setBillingSameAsShipping(false)
    setBillingFirstName(firstName)
    setBillingLastName(lastName)
    setBillingStreet(addressQuery)
    setBillingCity(city)
    setBillingRegion(region)
    setBillingPostcode(postcode)
    setBillingSelectedLocation(selectedLocation)
    setBillingLine2(showAddressLine2 ? addressLine2 : '')
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
    const nextErrors: Record<string, boolean> = {
      firstName: firstName.trim().length < 2,
      lastName: lastName.trim().length < 1,
      email: !email.trim(),
      address: !addressValid,
      city: city.trim().length < 2,
      postcode: !/^\d{5}$/.test(postcode.trim()),
      phone: phoneDigits.length !== 9,
    }
    if (!billingSameAsShipping) {
      nextErrors.billingFirstName = !billingIsCompany && billingFirstName.trim().length < 2
      nextErrors.billingLastName = !billingIsCompany && billingLastName.trim().length < 1
      nextErrors.billingCompanyName = billingIsCompany && billingCompanyName.trim().length < 2
      nextErrors.billingVat = billingIsCompany && !isPlausibleEuVat(billingVat)
      nextErrors.billingStreet = billingStreet.trim().length < 2
      nextErrors.billingCity = billingCity.trim().length < 2
      nextErrors.billingPostcode = !/^\d{5}$/.test(billingPostcode.trim())
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
      const deliveryLabel =
        selectedLocation?.label?.trim() ||
        `${addressQuery.trim()}, ${postcode.trim()} ${city.trim()}`
      const result = await savePurchaseCheckoutDelivery(supabase, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneRaw: phoneLocal,
        addressLine2: showAddressLine2 ? addressLine2 : '',
        location: {
          label: deliveryLabel,
          relativeCity: selectedLocation?.relativeCity ?? city.trim(),
          timezone: selectedLocation?.timezone ?? 'Europe/Paris',
          lat: selectedLocation?.lat ?? mapCenter.lat,
          lon: selectedLocation?.lon ?? mapCenter.lon,
        },
      })
      if (!result.ok) {
        setError(result.message)
        return
      }

      try {
        const billingPayload = billingSameAsShipping
          ? {sameAsShipping: true as const}
          : {
              sameAsShipping: false as const,
              isCompany: billingIsCompany,
              companyName: billingIsCompany ? billingCompanyName.trim() : null,
              vatNumber: billingIsCompany ? normalizeEuVat(billingVat) : null,
              firstName: billingIsCompany ? null : billingFirstName.trim(),
              lastName: billingIsCompany ? null : billingLastName.trim(),
              street: billingStreet.trim(),
              line2: billingLine2.trim() || null,
              city: billingCity.trim(),
              region: billingRegion.trim() || null,
              postcode: billingPostcode.trim(),
              label: billingSelectedLocation?.label ?? null,
            }
        sessionStorage.setItem(PURCHASE_BILLING_STORAGE_KEY, JSON.stringify(billingPayload))
      } catch {
        // ignore quota / private mode
      }

      const {
        data: {user},
      } = await supabase.auth.getUser()
      if (!user?.id) {
        setError('Session expirée. Reconnecte-toi pour payer.')
        return
      }

      const sync = await syncAndReserveWebsiteCartForCheckout(
        supabase,
        user.id,
        items.map((item) => item.id),
      )
      if (!sync.ok) {
        setError(sync.message)
        return
      }

      const {data: sessionData} = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) {
        setError('Session expirée. Reconnecte-toi pour payer.')
        return
      }

      trackWebsiteEvent('cart_checkout_started', {
        cart_id: sync.cartId,
        item_count: items.length,
      })
      trackWebsiteEvent('purchase_intent', {
        placement: 'purchase_checkout_submit',
        item_count: items.length,
      })

      const checkoutRes = await fetch('/api/cart/checkout', {
        method: 'POST',
        credentials: 'omit',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deliveryChannel: 'home',
          homeSpeed: 'standard',
          deliveryAddress: {
            label: deliveryLabel,
            lat: selectedLocation?.lat ?? mapCenter.lat,
            lon: selectedLocation?.lon ?? mapCenter.lon,
            city: city.trim(),
            relativeCity: selectedLocation?.relativeCity ?? city.trim(),
            timezone: selectedLocation?.timezone ?? 'Europe/Paris',
          },
          purchaseMode: true,
          acceptRentalTerms: true,
        }),
      })
      const checkoutPayload = (await checkoutRes.json().catch(() => null)) as {
        url?: string
        message?: string
      } | null
      if (!checkoutRes.ok || !checkoutPayload?.url) {
        setError(checkoutPayload?.message ?? 'Impossible de lancer le paiement Stripe.')
        return
      }

      window.location.href = checkoutPayload.url
      return
    } catch {
      setError('Impossible de lancer le paiement pour le moment.')
    } finally {
      setPending(false)
    }
  }

  if (bootstrapping || count === 0) {
    return <WebsitePageLoading label="Chargement du paiement" />
  }

  const billingReady =
    billingSameAsShipping ||
    (billingStreet.trim().length >= 2 &&
      billingCity.trim().length >= 2 &&
      /^\d{5}$/.test(billingPostcode.trim()) &&
      (billingIsCompany
        ? billingCompanyName.trim().length >= 2 && isPlausibleEuVat(billingVat)
        : billingFirstName.trim().length >= 2 && billingLastName.trim().length >= 1))

  const canPay =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 1 &&
    addressValid &&
    city.trim().length >= 2 &&
    /^\d{5}$/.test(postcode.trim()) &&
    normalizeFrenchLocalNumber(phoneLocal).length === 9 &&
    billingReady

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.formCol} aria-labelledby="delivery-heading">
          <h1 id="delivery-heading" className={styles.title}>
            Adresse de livraison
          </h1>
          <p className={styles.subtitle}>Ajoute ton adresse de livraison pour finaliser la commande.</p>

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

            <fieldset className={styles.billingBlock}>
              <legend className={styles.billingLegend}>Facturation</legend>
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={billingSameAsShipping}
                  onChange={(e) => {
                    if (e.target.checked) setBillingSameAsShipping(true)
                    else openDistinctBillingAddress()
                  }}
                />
                <span>L’adresse de facturation est identique à l’adresse de livraison</span>
              </label>

              {!billingSameAsShipping ? (
                <div className={styles.billingFields}>
                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={billingIsCompany}
                      onChange={(e) => {
                        setBillingIsCompany(e.target.checked)
                        setFieldErrors((p) => ({
                          ...p,
                          billingCompanyName: false,
                          billingVat: false,
                          billingFirstName: false,
                          billingLastName: false,
                        }))
                      }}
                    />
                    <span>Je facture à une entreprise</span>
                  </label>

                  {billingIsCompany ? (
                    <>
                      <label className={styles.field}>
                        <span className={styles.label}>Raison sociale *</span>
                        <input
                          className={`${styles.input} ${
                            fieldErrors.billingCompanyName ? styles.inputError : ''
                          }`}
                          value={billingCompanyName}
                          autoComplete="organization"
                          onChange={(e) => {
                            setBillingCompanyName(e.target.value)
                            setFieldErrors((p) => ({...p, billingCompanyName: false}))
                          }}
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>N° TVA intracommunautaire *</span>
                        <input
                          className={`${styles.input} ${
                            fieldErrors.billingVat ? styles.inputError : ''
                          }`}
                          value={billingVat}
                          autoComplete="off"
                          placeholder="FR12345678901"
                          onChange={(e) => {
                            setBillingVat(e.target.value.toUpperCase())
                            setFieldErrors((p) => ({...p, billingVat: false}))
                          }}
                        />
                      </label>
                    </>
                  ) : (
                    <div className={styles.row2}>
                      <label className={styles.field}>
                        <span className={styles.label}>Prénom *</span>
                        <input
                          className={`${styles.input} ${
                            fieldErrors.billingFirstName ? styles.inputError : ''
                          }`}
                          value={billingFirstName}
                          autoComplete="billing given-name"
                          onChange={(e) => {
                            setBillingFirstName(e.target.value)
                            setFieldErrors((p) => ({...p, billingFirstName: false}))
                          }}
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>Nom *</span>
                        <input
                          className={`${styles.input} ${
                            fieldErrors.billingLastName ? styles.inputError : ''
                          }`}
                          value={billingLastName}
                          autoComplete="billing family-name"
                          onChange={(e) => {
                            setBillingLastName(e.target.value)
                            setFieldErrors((p) => ({...p, billingLastName: false}))
                          }}
                        />
                      </label>
                    </div>
                  )}

                  <div className={styles.field}>
                    <span className={styles.label}>Adresse de facturation *</span>
                    <div className={styles.addressWrap}>
                      <input
                        className={`${styles.input} ${
                          fieldErrors.billingStreet ? styles.inputError : ''
                        }`}
                        value={billingStreet}
                        autoComplete="billing street-address"
                        placeholder="Numéro et rue"
                        aria-autocomplete="list"
                        aria-expanded={showBillingSuggestions}
                        onFocus={() => setShowBillingSuggestions(true)}
                        onBlur={() => {
                          window.setTimeout(() => setShowBillingSuggestions(false), 140)
                        }}
                        onChange={(e) => {
                          setBillingStreet(e.target.value)
                          setBillingSelectedLocation(null)
                          setShowBillingSuggestions(true)
                          setFieldErrors((p) => ({...p, billingStreet: false}))
                        }}
                        onKeyDown={(e) => {
                          if (!showBillingSuggestions || billingSuggestions.length === 0) return
                          if (e.key === 'ArrowDown') {
                            e.preventDefault()
                            setBillingActiveSuggestion((prev) =>
                              prev < 0 ? 0 : Math.min(prev + 1, billingSuggestions.length - 1),
                            )
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault()
                            setBillingActiveSuggestion((prev) => (prev <= 0 ? 0 : prev - 1))
                          } else if (
                            e.key === 'Enter' &&
                            billingActiveSuggestion >= 0 &&
                            billingActiveSuggestion < billingSuggestions.length
                          ) {
                            e.preventDefault()
                            selectBillingSuggestion(billingSuggestions[billingActiveSuggestion]!)
                          }
                        }}
                      />
                      {showBillingSuggestions &&
                      (billingLocationLoading || billingSuggestions.length > 0) ? (
                        <div
                          className={styles.suggestions}
                          role="listbox"
                          aria-label="Suggestions d’adresse de facturation"
                        >
                          {billingLocationLoading ? (
                            <p className={styles.hint}>Recherche d’adresses…</p>
                          ) : (
                            billingSuggestions.map((suggestion, index) => (
                              <button
                                key={suggestion.id}
                                type="button"
                                role="option"
                                aria-selected={index === billingActiveSuggestion}
                                className={`${styles.suggestion} ${
                                  index === billingActiveSuggestion ? styles.suggestionActive : ''
                                }`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => selectBillingSuggestion(suggestion)}
                              >
                                <span className={styles.suggestionLabel}>{suggestion.label}</span>
                                {suggestion.secondary ? (
                                  <span className={styles.suggestionSecondary}>
                                    {suggestion.secondary}
                                  </span>
                                ) : null}
                              </button>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <label className={styles.field}>
                    <span className={styles.label}>Complément d’adresse</span>
                    <input
                      className={styles.input}
                      value={billingLine2}
                      autoComplete="billing address-line2"
                      placeholder="Appartement, étage, bâtiment…"
                      onChange={(e) => setBillingLine2(e.target.value)}
                    />
                  </label>

                  <div className={styles.rowCityZip}>
                    <label className={styles.field}>
                      <span className={styles.label}>Ville *</span>
                      <input
                        className={`${styles.input} ${
                          fieldErrors.billingCity ? styles.inputError : ''
                        }`}
                        value={billingCity}
                        autoComplete="billing address-level2"
                        onChange={(e) => {
                          setBillingCity(e.target.value)
                          setFieldErrors((p) => ({...p, billingCity: false}))
                        }}
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>Province/État</span>
                      <input
                        className={styles.input}
                        value={billingRegion}
                        autoComplete="billing address-level1"
                        onChange={(e) => setBillingRegion(e.target.value)}
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>Code postal *</span>
                      <input
                        className={`${styles.input} ${
                          fieldErrors.billingPostcode ? styles.inputError : ''
                        }`}
                        value={billingPostcode}
                        autoComplete="billing postal-code"
                        inputMode="numeric"
                        onChange={(e) => {
                          setBillingPostcode(e.target.value.replace(/\D/g, '').slice(0, 5))
                          setFieldErrors((p) => ({...p, billingPostcode: false}))
                        }}
                      />
                    </label>
                  </div>
                </div>
              ) : null}
            </fieldset>

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
            {pending ? 'Redirection vers le paiement…' : 'Passer la commande'}
          </button>

          <div className={styles.payMethodsWrap}>
            <CartPaymentMethodsRow />
          </div>

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
        </aside>
      </div>
    </main>
  )
}

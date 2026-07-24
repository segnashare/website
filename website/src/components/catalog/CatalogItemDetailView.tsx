'use client'

import {AddToCartModal} from '@/components/cart/AddToCartModal'
import {CatalogItemLooksSection} from '@/components/catalog/CatalogItemLooksSection'
import {CatalogItemPhotoCover} from '@/components/catalog/CatalogItemPhotoCover'
import {openItemChat} from '@/lib/item-chat/client-storage'
import {formatCatalogPurchasePriceLabel} from '@/lib/catalog/catalog-borrow-price-label'
import {isMarketingCatalogItemSold} from '@/lib/catalog/catalog-card-badges'
import {catalogSubscriptionHref} from '@/lib/catalog/catalog-app-links'
import type {CatalogItemDetailPayload} from '@/lib/catalog/catalog-item-detail'
import type {CatalogItemLookMedia} from '@/lib/catalog/catalog-item-style-looks'
import {formatCatalogCardSizeLabel} from '@/lib/catalog/format-catalog-card-size'
import {itemDescriptionToSafeHtml} from '@/lib/catalog/item-description-format'
import {formatItemDimensionDisplayValue, formatItemEraLabel} from '@/lib/catalog/item-era-fitting-dimensions'
import {addWebsiteCartItem} from '@/lib/cart/website-cart'
import {useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type UIEvent} from 'react'
import {createPortal} from 'react-dom'
import styles from './catalogItemDetailView.module.css'

const HELP_URL = 'https://help.segnashare.com'

type Props = {
  detail: CatalogItemDetailPayload
  titleId?: string
  layout?: 'modal' | 'page'
  /** Looks liés — grille sous les accordéons (page uniquement). */
  looks?: CatalogItemLookMedia[]
}

function TrustLine({children}: {children: string}) {
  return (
    <p className={styles.trustLine}>
      <span className={styles.trustIcon} aria-hidden>
        ✓
      </span>
      <span>{children}</span>
    </p>
  )
}

function DetailLine({label, value}: {label: string; value: string}) {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '—') return null
  return (
    <p className={styles.detailLine}>
      <span className={styles.detailLineLabel}>{label}&nbsp;:</span> {trimmed}
    </p>
  )
}

/** Accordéon type app (`ItemDetailAccordions`). */
function AppAccordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()

  return (
    <div className={styles.appAccordion}>
      <button
        type="button"
        className={styles.appAccordionBtn}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className={styles.appAccordionTitle}>{title}</span>
        <svg
          className={styles.appAccordionChevron}
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          {open ? (
            <path d="m6 15 6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </button>
      {open ? (
        <div id={panelId} className={styles.appAccordionPanel}>
          {children}
        </div>
      ) : null}
    </div>
  )
}

/** Carte taille / état type app (`ItemSizeConditionCard`). */
function SizeConditionCard({
  itemId,
  itemTitle,
  sizeLine,
  condition,
  fitting,
  dimensions,
}: {
  itemId: string
  itemTitle: string
  sizeLine: string
  condition: string | null
  fitting: string | null
  dimensions: Array<{label: string; value: string}>
}) {
  const panelId = useId()
  const [sizeInfoOpen, setSizeInfoOpen] = useState(false)
  const [coords, setCoords] = useState<{top: number; left: number; width: number; arrowLeft: number} | null>(
    null,
  )
  const infoBtnRef = useRef<HTMLButtonElement>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const conditionLine = condition?.trim() || '—'
  const fittingText = fitting?.trim() || ''
  const dims = dimensions.filter((d) => d.value.trim())
  const hasSizeDetails = Boolean(fittingText) || dims.length > 0

  useLayoutEffect(() => {
    if (!sizeInfoOpen || !infoBtnRef.current) {
      setCoords(null)
      return
    }
    const place = () => {
      const rect = infoBtnRef.current!.getBoundingClientRect()
      const width = Math.min(280, window.innerWidth - 24)
      const margin = 12
      const anchorX = rect.left + rect.width / 2
      let left = anchorX - width / 2
      if (left < margin) left = margin
      if (left + width > window.innerWidth - margin) left = window.innerWidth - margin - width
      const arrowPad = 14
      const arrowLeft = Math.min(Math.max(anchorX - left, arrowPad), width - arrowPad)
      setCoords({top: rect.top - 10, left, width, arrowLeft})
    }
    place()
    requestAnimationFrame(place)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [sizeInfoOpen, fittingText, dims.length])

  useEffect(() => {
    if (!sizeInfoOpen) return
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (bubbleRef.current?.contains(target)) return
      if (infoBtnRef.current?.contains(target)) return
      setSizeInfoOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSizeInfoOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [sizeInfoOpen])

  return (
    <div className={styles.sizeCard}>
      <div className={styles.sizeCardGrid}>
        <div>
          <p className={styles.sizeCardLabel}>
            Taille étiquette
            {hasSizeDetails ? (
              <button
                ref={infoBtnRef}
                type="button"
                className={styles.sizeCardInfoBtn}
                aria-label="Détails taille : fitting et dimensions"
                aria-expanded={sizeInfoOpen}
                aria-controls={panelId}
                onClick={() => setSizeInfoOpen((v) => !v)}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 10v6" strokeLinecap="round" />
                  <circle cx="12" cy="7" r="0.75" fill="currentColor" stroke="none" />
                </svg>
              </button>
            ) : null}
          </p>
          <p className={styles.sizeCardValue}>{sizeLine}</p>
        </div>
        <div>
          <p className={styles.sizeCardLabel}>État</p>
          <p className={styles.sizeCardValue}>{conditionLine}</p>
        </div>
      </div>

      {sizeInfoOpen && coords && hasSizeDetails
        ? createPortal(
            <div
              ref={bubbleRef}
              id={panelId}
              role="dialog"
              aria-label="Fitting et dimensions"
              className={styles.sizeCardBubble}
              style={{
                top: coords.top,
                left: coords.left,
                width: coords.width,
                ['--size-bubble-arrow-left' as string]: `${coords.arrowLeft}px`,
              }}
            >
              <span className={styles.sizeCardBubbleArrow} aria-hidden />
              {fittingText ? (
                <div className={styles.sizeCardDetailsBlock}>
                  <p className={styles.sizeCardDetailsTitle}>Fitting</p>
                  <p className={styles.sizeCardDetailsText}>{fittingText}</p>
                </div>
              ) : null}
              {dims.length ? (
                <div className={styles.sizeCardDetailsBlock}>
                  <p className={styles.sizeCardDetailsTitle}>Dimensions</p>
                  <ul className={styles.sizeCardDimsList}>
                    {dims.map((d) => (
                      <li key={d.label}>
                        <span>{d.label}</span>
                        <span className={styles.sizeCardDimsValue}>
                          {formatItemDimensionDisplayValue(d.value)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}

      <div className={styles.sizeCardAsk}>
        <button
          type="button"
          className={styles.sizeCardAskLink}
          onClick={() =>
            openItemChat({
              itemId,
              itemTitle,
              itemSizeLabel: sizeLine,
              itemConditionLabel: conditionLine,
            })
          }
        >
          <svg
            className={styles.sizeCardAskIcon}
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" strokeLinejoin="round" />
          </svg>
          <span className={styles.sizeCardAskText}>
            Une question sur la taille, l&apos;état ou un autre détail&nbsp;? Écris-nous.
          </span>
        </button>
      </div>
    </div>
  )
}

function CtaBlock({
  sold,
  subscriptionHref,
  addPending,
  onAddToCart,
}: {
  sold: boolean
  subscriptionHref: string
  addPending: boolean
  onAddToCart: () => void
}) {
  if (sold) {
    return <p className={styles.soldNote}>Cette pièce n&apos;est plus disponible.</p>
  }
  return (
    <div className={styles.ctaBlock}>
      <div className={styles.ctaRow}>
        <button
          type="button"
          className={styles.ctaPrimary}
          disabled={addPending}
          onClick={onAddToCart}
        >
          {addPending ? 'Ajout…' : 'Ajouter au panier'}
        </button>
        <a href={subscriptionHref} className={styles.ctaSecondary} aria-label="Louer 1 mois avec SegnaX">
          <span className={styles.ctaInline}>
            <span>Louer 1 mois avec</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/segnaX_logo_mark.png"
              alt="segnaX"
              className={styles.ctaSegnaX}
              width={96}
              height={28}
              decoding="async"
            />
          </span>
        </a>
      </div>
      <a href={subscriptionHref} className={styles.promoNote}>
        *&nbsp;Louez cette pièce pendant 1 mois avec l&apos;abonnement Segna, puis profitez de 30&nbsp;% de
        réduction si vous souhaitez l&apos;acheter.
      </a>
    </div>
  )
}

function InfoPanel({
  detail,
  titleId,
  sold,
  sizeLine,
  subscriptionHref,
  looks,
  addPending,
  onAddToCart,
}: {
  detail: CatalogItemDetailPayload
  titleId?: string
  sold: boolean
  sizeLine: string
  subscriptionHref: string
  looks: CatalogItemLookMedia[]
  addPending: boolean
  onAddToCart: () => void
}) {
  const description = detail.description?.trim() || ''
  const descriptionHtml = useMemo(() => itemDescriptionToSafeHtml(description), [description])
  const materials = detail.materials_label?.trim() || ''
  const color = detail.color_label?.trim() || ''
  const eraLabel = formatItemEraLabel(detail.item_era) ?? ''
  const showDescriptionSection = Boolean(descriptionHtml || materials || color || eraLabel)

  return (
    <>
      {detail.brand_label ? <span className={styles.brand}>{detail.brand_label}</span> : null}
      <h2 className={styles.title} id={titleId}>
        {detail.title}
      </h2>
      {sold ? null : (
        <p className={styles.price}>{formatCatalogPurchasePriceLabel(detail.price_points)}</p>
      )}

      <SizeConditionCard
        itemId={detail.id}
        itemTitle={detail.title}
        sizeLine={sizeLine}
        condition={detail.condition_label}
        fitting={detail.item_fitting}
        dimensions={detail.item_dimensions}
      />

      <div className={styles.trustBlock}>
        <TrustLine>Authenticité certifiée</TrustLine>
        <TrustLine>Un seul exemplaire en stock</TrustLine>
      </div>

      <CtaBlock
        sold={sold}
        subscriptionHref={subscriptionHref}
        addPending={addPending}
        onAddToCart={onAddToCart}
      />

      <div className={styles.appAccordionList}>
        {showDescriptionSection ? (
          <AppAccordion title="Description & mesures" defaultOpen>
            <DetailLine label="Collection" value={eraLabel} />
            <DetailLine label="Couleur" value={color} />
            <DetailLine label="Matériaux" value={materials} />
            {descriptionHtml ? (
              <div
                className={styles.richDescription}
                dangerouslySetInnerHTML={{__html: descriptionHtml}}
              />
            ) : null}
            {detail.category_label?.trim() ? (
              <DetailLine label="Catégorie" value={detail.category_label.trim()} />
            ) : null}
          </AppAccordion>
        ) : null}

        <AppAccordion title="Livraison">
          <p className={styles.description}>
            <strong>Modes de livraison proposés</strong>
          </p>

          <p className={styles.deliveryModeTitle}>1. Livraison à domicile</p>
          <p className={styles.deliveryOptionTitle}>Chrono 18 – Domicile</p>
          <p className={styles.description}>
            Délai&nbsp;: 1 à 2 jours ouvrés après expédition.
          </p>
          <p className={styles.description}>Livraison directement chez toi, partout en France.</p>
          <p className={styles.description}>Idéal pour une tenue dont tu as besoin rapidement.</p>

          <p className={styles.deliveryOptionTitle}>Mondial Relay Standard – Domicile</p>
          <p className={styles.description}>
            Délai&nbsp;: 4 à 5 jours ouvrés après expédition.
          </p>
          <p className={styles.description}>Option plus économique pour les locations moins urgentes.</p>

          <p className={styles.deliveryModeTitle}>2. Livraison en point relais</p>
          <p className={styles.deliveryOptionTitle}>Livraison point relais Mondial Relay</p>
          <p className={styles.description}>
            Délai&nbsp;: 4 à 5 jours ouvrés après expédition.
          </p>
          <p className={styles.description}>
            Tu choisis le point relais le plus pratique (près de chez toi, du bureau, etc.).
          </p>
          <p className={styles.description}>
            Pratique si tu n&apos;es pas disponible pour la réception à domicile.
          </p>

          <p className={styles.deliveryModeTitle}>3. Retour des pièces</p>
          <p className={styles.description}>
            Le retour se fait via dépôt en point relais Chronopost / Mondial Relay, selon le mode choisi.
          </p>
          <p className={styles.description}>
            Les instructions de retour (étiquette, délai, point relais) sont précisées dans ton mail de
            confirmation et dans le{' '}
            <a href={HELP_URL} className={styles.inlineLink} target="_blank" rel="noreferrer">
              centre d&apos;aide
            </a>
            .
          </p>
        </AppAccordion>

        <AppAccordion title="Authentification experte">
          <p className={styles.description}>
            Chaque pièce est rigoureusement contrôlée par notre équipe d&apos;experts avant mise en ligne, afin de
            garantir son authenticité et son état.
          </p>
          <p className={styles.description}>
            Nous combinons contrôle physique, vérification documentaire et analyse des détails de fabrication
            (matières, finitions, numéros de série le cas échéant) pour assurer une sélection premium cohérente
            avec les standards du luxe.
          </p>
        </AppAccordion>

        <AppAccordion title="Paiement flexible & sécurisé">
          <p className={styles.description}>
            Les paiements sur Segna sont traités via Stripe, l&apos;une des solutions de paiement les plus utilisées
            au monde, certifiée PCI DSS niveau 1 et conforme aux standards internationaux de sécurité des
            données de cartes bancaires.
          </p>
          <p className={styles.description}>
            Vos informations de paiement sont chiffrées et ne sont jamais stockées par Segna&nbsp;; Stripe
            utilise notamment le chiffrement AES‑256 et des connexions sécurisées TLS pour protéger vos
            données.
          </p>
          <p className={styles.description}>
            Sur l&apos;app Segna, achetez ou louez librement selon vos envies grâce à des options de paiement
            flexibles&nbsp;: paiement à l&apos;acte ou via abonnement, avec des réductions dédiées sur les
            pièces. Stripe nous permet de gérer ces paiements uniques et récurrents de manière fiable, tout en
            réduisant la fraude et les échecs de paiement.
          </p>
          <p className={styles.description}>
            À l&apos;achat&nbsp;: <strong>10&nbsp;%</strong> sur l&apos;app.
            <br />
            Avec abonnement&nbsp;: <strong>30&nbsp;%</strong> sur l&apos;app.
          </p>
        </AppAccordion>
      </div>

      {looks.length > 0 ? <CatalogItemLooksSection looks={looks} /> : null}
    </>
  )
}

export function CatalogItemDetailView({detail, titleId, layout = 'modal', looks = []}: Props) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [addPending, setAddPending] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const heroTrackRef = useRef<HTMLDivElement | null>(null)
  const lightboxTrackRef = useRef<HTMLDivElement | null>(null)
  const photoIndexRef = useRef(0)
  const pointerStartX = useRef<number | null>(null)
  const pointerMoved = useRef(false)
  const slots = detail.gallery
  const sizeLine = formatCatalogCardSizeLabel(detail.size_label, detail.size_code)
  const sold = isMarketingCatalogItemSold(detail.status)
  const subscriptionHref = catalogSubscriptionHref()
  const isPage = layout === 'page'

  photoIndexRef.current = photoIndex

  const handleAddToCart = useCallback(() => {
    if (sold || addPending) return
    setAddPending(true)
    try {
      addWebsiteCartItem({
        id: detail.id,
        title: detail.title,
        brand_label: detail.brand_label,
        price_points: detail.price_points,
        imageUrl: detail.gallery[0]?.url ?? null,
        size_label: detail.size_label,
        size_code: detail.size_code,
      })
      setAddModalOpen(true)
    } finally {
      setAddPending(false)
    }
  }, [addPending, detail, sold])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setPhotoIndex(0)
    setLightboxOpen(false)
    setAddModalOpen(false)
    const track = heroTrackRef.current
    if (track) track.scrollTo({left: 0, behavior: 'auto'})
  }, [detail.id])

  useEffect(() => {
    if (!lightboxOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const indexAtOpen = photoIndexRef.current
    const frame = window.requestAnimationFrame(() => {
      const track = lightboxTrackRef.current
      const slide = track?.children[indexAtOpen] as HTMLElement | undefined
      if (track && slide) track.scrollTo({left: slide.offsetLeft, behavior: 'auto'})
    })
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
      window.cancelAnimationFrame(frame)
      // Sync carousel modal uniquement (page = grille, pas de track).
      const hero = heroTrackRef.current
      if (!hero) return
      const idx = photoIndexRef.current
      const heroSlide = hero.children[idx] as HTMLElement | undefined
      if (heroSlide) hero.scrollTo({left: heroSlide.offsetLeft, behavior: 'auto'})
    }
  }, [lightboxOpen])

  const selectPhoto = useCallback((index: number) => {
    setPhotoIndex(index)
    const track = heroTrackRef.current
    const slide = track?.children[index] as HTMLElement | undefined
    if (!track || !slide) return
    track.scrollTo({left: slide.offsetLeft, behavior: 'smooth'})
  }, [])

  const onHeroScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const track = event.currentTarget
      const width = track.clientWidth
      if (width <= 0 || slots.length === 0) return
      const next = Math.min(slots.length - 1, Math.max(0, Math.round(track.scrollLeft / width)))
      setPhotoIndex((prev) => (prev === next ? prev : next))
    },
    [slots.length],
  )

  const onLightboxScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const track = event.currentTarget
      const width = track.clientWidth
      if (width <= 0 || slots.length === 0) return
      const next = Math.min(slots.length - 1, Math.max(0, Math.round(track.scrollLeft / width)))
      setPhotoIndex((prev) => (prev === next ? prev : next))
    },
    [slots.length],
  )

  const onHeroPointerDown = useCallback((clientX: number) => {
    pointerStartX.current = clientX
    pointerMoved.current = false
  }, [])

  const onHeroPointerMove = useCallback((clientX: number) => {
    if (pointerStartX.current == null) return
    if (Math.abs(clientX - pointerStartX.current) > 10) pointerMoved.current = true
  }, [])

  const openLightboxIfTap = useCallback(() => {
    if (pointerMoved.current || slots.length === 0) return
    setLightboxOpen(true)
  }, [slots.length])

  const lightbox =
    mounted && lightboxOpen && slots.length > 0
      ? createPortal(
          <div className={styles.lightbox} role="dialog" aria-modal aria-label="Photo en plein écran">
            <button
              type="button"
              className={styles.lightboxClose}
              aria-label="Fermer"
              onClick={() => setLightboxOpen(false)}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
            <div ref={lightboxTrackRef} className={styles.lightboxTrack} onScroll={onLightboxScroll}>
              {slots.map((slot, i) => (
                <div key={`${slot.url}-lb-${i}`} className={styles.lightboxSlide}>
                  <CatalogItemPhotoCover
                    imageUrl={slot.url}
                    position={slot.position}
                    centerCover
                    objectPosition="center center"
                  />
                </div>
              ))}
            </div>
            {slots.length > 1 ? (
              <p className={styles.lightboxCounter}>
                {photoIndex + 1}&nbsp;/&nbsp;{slots.length}
              </p>
            ) : null}
          </div>,
          document.body,
        )
      : null

  if (isPage) {
    return (
      <div className={`${styles.body} ${styles.bodyPage}`}>
        <div className={styles.galleryCol} aria-label="Photos de la pièce">
          {slots.length > 0 ? (
            slots.map((slot, i) => (
              <button
                key={`${slot.url}-${i}`}
                type="button"
                className={styles.pagePhoto}
                aria-label={`Agrandir la photo ${i + 1}`}
                onClick={() => {
                  setPhotoIndex(i)
                  setLightboxOpen(true)
                }}
              >
                <CatalogItemPhotoCover imageUrl={slot.url} position={slot.position} />
              </button>
            ))
          ) : (
            <div className={styles.pagePhoto} aria-hidden />
          )}
        </div>

        <div className={styles.infoCol}>
          <div className={styles.infoSticky}>
            <InfoPanel
              detail={detail}
              titleId={titleId}
              sold={sold}
              sizeLine={sizeLine}
              subscriptionHref={subscriptionHref}
              looks={looks}
              addPending={addPending}
              onAddToCart={handleAddToCart}
            />
          </div>
        </div>
        {lightbox}
        <AddToCartModal
          open={addModalOpen}
          itemTitle={detail.title}
          onClose={() => setAddModalOpen(false)}
          onContinueShopping={() => setAddModalOpen(false)}
        />
      </div>
    )
  }

  return (
    <div className={`${styles.body} ${styles.bodyModal}`}>
      <div className={styles.galleryCol}>
        <div className={styles.swipeGallery}>
          <div
            ref={heroTrackRef}
            className={styles.heroTrack}
            onScroll={onHeroScroll}
            aria-label="Photos de la pièce"
            onPointerDown={(e) => onHeroPointerDown(e.clientX)}
            onPointerMove={(e) => onHeroPointerMove(e.clientX)}
            onPointerUp={openLightboxIfTap}
            onPointerCancel={() => {
              pointerStartX.current = null
            }}
          >
            {slots.length > 0 ? (
              slots.map((slot, i) => (
                <div key={`${slot.url}-${i}`} className={styles.heroSlide}>
                  <CatalogItemPhotoCover
                    imageUrl={slot.url}
                    position={slot.position}
                    centerCover
                    objectPosition="center center"
                  />
                </div>
              ))
            ) : (
              <div className={styles.heroSlide} />
            )}
          </div>
        </div>

        {slots.length > 1 ? (
          <div className={styles.thumbsSection}>
            <div className={styles.thumbs} role="list" aria-label="Miniatures">
              {slots.map((slot, i) => (
                <button
                  key={`${slot.url}-${i}`}
                  type="button"
                  className={`${styles.thumb} ${i === photoIndex ? styles.thumbActive : ''}`}
                  aria-label={`Photo ${i + 1}`}
                  aria-current={i === photoIndex ? 'true' : undefined}
                  onClick={() => selectPhoto(i)}
                >
                  <CatalogItemPhotoCover imageUrl={slot.url} position={slot.position} />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className={styles.infoCol}>
        <InfoPanel
          detail={detail}
          titleId={titleId}
          sold={sold}
          sizeLine={sizeLine}
          subscriptionHref={subscriptionHref}
          looks={[]}
          addPending={addPending}
          onAddToCart={handleAddToCart}
        />
      </div>
      {lightbox}
      <AddToCartModal
        open={addModalOpen}
        itemTitle={detail.title}
        onClose={() => setAddModalOpen(false)}
        onContinueShopping={() => setAddModalOpen(false)}
      />
    </div>
  )
}

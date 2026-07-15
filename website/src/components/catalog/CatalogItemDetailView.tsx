'use client'

import {CatalogItemLooksSection} from '@/components/catalog/CatalogItemLooksSection'
import {CatalogItemPhotoCover} from '@/components/catalog/CatalogItemPhotoCover'
import {formatCatalogPurchasePriceLabel} from '@/lib/catalog/catalog-borrow-price-label'
import {isMarketingCatalogItemSold} from '@/lib/catalog/catalog-card-badges'
import {catalogAppSignupHref, catalogItemAppHref} from '@/lib/catalog/catalog-app-links'
import type {CatalogItemDetailPayload} from '@/lib/catalog/catalog-item-detail'
import type {CatalogItemLookMedia} from '@/lib/catalog/catalog-item-style-looks'
import {formatCatalogCardSizeLabel} from '@/lib/catalog/format-catalog-card-size'
import {useEffect, useId, useState, type ReactNode} from 'react'
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
function SizeConditionCard({sizeLine, condition}: {sizeLine: string; condition: string | null}) {
  return (
    <div className={styles.sizeCard}>
      <div className={styles.sizeCardGrid}>
        <div>
          <p className={styles.sizeCardLabel}>Taille étiquette</p>
          <p className={styles.sizeCardValue}>{sizeLine}</p>
        </div>
        <div>
          <p className={styles.sizeCardLabel}>
            État
            <span
              className={styles.sizeCardHint}
              title="Chaque pièce est inspectée avec soin pour garantir la qualité, l'authenticité et l'état. Consultez les photos et la description pour plus de détails."
              aria-label="Informations sur l'état"
            >
              i
            </span>
          </p>
          <p className={styles.sizeCardValue}>{condition?.trim() || '—'}</p>
        </div>
      </div>
    </div>
  )
}

function CtaBlock({sold, appHref}: {sold: boolean; appHref: string}) {
  if (sold) {
    return <p className={styles.soldNote}>Cette pièce n&apos;est plus disponible.</p>
  }
  return (
    <div className={styles.ctaBlock}>
      <div className={styles.ctaRow}>
        <button type="button" className={styles.ctaPrimary}>
          <span className={styles.ctaInline}>
            <span>Achète avec</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/stripe-wordmark-white.png"
              alt="Stripe"
              className={styles.ctaStripe}
              width={72}
              height={22}
              decoding="async"
            />
          </span>
        </button>
        <a href={appHref} className={styles.ctaSecondary}>
          <span className={styles.ctaInline}>
            <span>Loue sur</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/segna-logo.svg"
              alt="Segna"
              className={styles.ctaSegna}
              width={56}
              height={23}
              decoding="async"
            />
          </span>
        </a>
      </div>
      <a href={catalogAppSignupHref()} className={styles.promoNote}>
        Prix réduit pour les membres&nbsp;: -10&nbsp;% via l&apos;app, -30&nbsp;% avec l'abonnement
      </a>
    </div>
  )
}

function InfoPanel({
  detail,
  titleId,
  sold,
  sizeLine,
  appHref,
  full,
  looks,
}: {
  detail: CatalogItemDetailPayload
  titleId?: string
  sold: boolean
  sizeLine: string
  appHref: string
  full: boolean
  looks: CatalogItemLookMedia[]
}) {
  const description = detail.description?.trim() || ''
  const materials = detail.materials_label?.trim() || ''
  const color = detail.color_label?.trim() || ''
  const showDescriptionSection = Boolean(description || materials || color)

  return (
    <>
      {detail.brand_label ? <span className={styles.brand}>{detail.brand_label}</span> : null}
      <h2 className={styles.title} id={titleId}>
        {detail.title}
      </h2>
      {sold ? null : (
        <p className={styles.price}>{formatCatalogPurchasePriceLabel(detail.price_points)}</p>
      )}

      {full ? (
        <SizeConditionCard sizeLine={sizeLine} condition={detail.condition_label} />
      ) : (
        <div className={styles.attrsBox}>
          <div className={styles.attrRow}>
            <span className={styles.attrKey}>Taille</span>
            <span className={styles.attrVal}>{sizeLine}</span>
          </div>
          {detail.condition_label?.trim() ? (
            <div className={styles.attrRow}>
              <span className={styles.attrKey}>État</span>
              <span className={styles.attrVal}>{detail.condition_label.trim()}</span>
            </div>
          ) : null}
          {color ? (
            <div className={styles.attrRow}>
              <span className={styles.attrKey}>Couleur</span>
              <span className={styles.attrVal}>{color}</span>
            </div>
          ) : null}
          {detail.category_label?.trim() ? (
            <div className={styles.attrRow}>
              <span className={styles.attrKey}>Catégorie</span>
              <span className={styles.attrVal}>{detail.category_label.trim()}</span>
            </div>
          ) : null}
          {materials ? (
            <div className={styles.attrRow}>
              <span className={styles.attrKey}>Matières</span>
              <span className={styles.attrVal}>{materials}</span>
            </div>
          ) : null}
        </div>
      )}

      <div className={styles.trustBlock}>
        <TrustLine>Authenticité certifiée</TrustLine>
        <TrustLine>Un seul exemplaire en stock</TrustLine>
      </div>

      <CtaBlock sold={sold} appHref={appHref} />

      {full ? (
        <div className={styles.appAccordionList}>
          {showDescriptionSection ? (
            <AppAccordion title="Description & mesures" defaultOpen>
              <DetailLine label="Couleur" value={color} />
              <DetailLine label="Matériaux" value={materials} />
              <DetailLine label="Description" value={description} />
              {detail.category_label?.trim() ? (
                <DetailLine label="Catégorie" value={detail.category_label.trim()} />
              ) : null}
            </AppAccordion>
          ) : null}

          <AppAccordion title="Livraison">
            <p className={styles.description}>
              Les commandes sont préparées sous <strong>24 à 48&nbsp;h</strong> dans nos ateliers parisiens, puis
              expédiées via transporteur express.
            </p>
            <p className={styles.description}>Délais indicatifs à compter de l&apos;expédition&nbsp;:</p>
            <ul className={styles.bulletList}>
              <li>
                <strong>France</strong>&nbsp;: environ 1 jour ouvré
              </li>
              <li>
                <strong>Europe</strong>&nbsp;: 1 à 2 jours ouvrés
              </li>
              <li>
                <strong>Hors Europe</strong>&nbsp;: 1 à 2 jours ouvrés (hors délais douaniers)
              </li>
            </ul>
            <p className={styles.description}>
              Ces délais peuvent varier selon le transporteur, les formalités douanières ou des événements
              indépendants de Segna. Pour les modalités de retour, consultez notre{' '}
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
      ) : null}

      {full && looks.length > 0 ? <CatalogItemLooksSection looks={looks} /> : null}

      {!full && description ? (
        <div className={styles.descBlock}>
          <h3 className={styles.descHeading}>Description</h3>
          <p className={styles.description}>{description}</p>
        </div>
      ) : null}
    </>
  )
}

export function CatalogItemDetailView({detail, titleId, layout = 'modal', looks = []}: Props) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const slots = detail.gallery
  const active = slots[photoIndex] ?? slots[0]
  const sizeLine = formatCatalogCardSizeLabel(detail.size_label, detail.size_code)
  const sold = isMarketingCatalogItemSold(detail.status)
  const appHref = catalogItemAppHref(detail.id)
  const isPage = layout === 'page'

  useEffect(() => {
    setPhotoIndex(0)
  }, [detail.id])

  if (isPage) {
    return (
      <div className={`${styles.body} ${styles.bodyPage}`}>
        <div className={styles.galleryCol} aria-label="Photos de la pièce">
          {slots.length > 0 ? (
            slots.map((slot, i) => (
              <div key={`${slot.url}-${i}`} className={styles.stackShot}>
                <CatalogItemPhotoCover imageUrl={slot.url} position={slot.position} />
              </div>
            ))
          ) : (
            <div className={styles.stackShot} />
          )}
        </div>

        <div className={styles.infoCol}>
          <div className={styles.infoSticky}>
            <InfoPanel
              detail={detail}
              titleId={titleId}
              sold={sold}
              sizeLine={sizeLine}
              appHref={appHref}
              full
              looks={looks}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.body}>
      <div className={styles.galleryCol}>
        {active ? (
          <div className={styles.hero}>
            <CatalogItemPhotoCover imageUrl={active.url} position={active.position} />
          </div>
        ) : null}
        {slots.length > 1 ? (
          <div className={styles.thumbs} aria-label="Photos de la pièce">
            {slots.map((slot, i) => (
              <button
                key={`${slot.url}-${i}`}
                type="button"
                className={`${styles.thumb} ${i === photoIndex ? styles.thumbActive : ''}`}
                aria-label={`Photo ${i + 1}`}
                aria-current={i === photoIndex ? 'true' : undefined}
                onClick={() => setPhotoIndex(i)}
              >
                <CatalogItemPhotoCover imageUrl={slot.url} position={slot.position} />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.infoCol}>
        <InfoPanel
          detail={detail}
          titleId={titleId}
          sold={sold}
          sizeLine={sizeLine}
          appHref={appHref}
          full={false}
          looks={[]}
        />
      </div>
    </div>
  )
}

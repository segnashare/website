import {createClient} from '@sanity/client'
import {createImageUrlBuilder} from '@sanity/image-url'
import type {PortableTextBlock} from '@portabletext/types'
import {unstable_cache} from 'next/cache'
import {cache} from 'react'

/** Durée max sans webhook (sec). 60 s = filet de sécurité ; instantané si webhook OK. */
const SANITY_DATA_REVALIDATE_SEC = 60

/** ISR pages marketing — même valeur que le cache données Sanity. */
export const CMS_ISR_REVALIDATE_SEC = SANITY_DATA_REVALIDATE_SEC

/** Tag partagé pour invalider tout le cache Sanity via POST /api/revalidate. */
export const SANITY_CACHE_TAG = 'sanity-cms'

const sanityCacheOptions = {
  revalidate: SANITY_DATA_REVALIDATE_SEC,
  tags: [SANITY_CACHE_TAG],
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? '1qxhnoe8'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01'

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  // API live : le CDN Sanity retarde les mises à jour ~1 min après publication.
  useCdn: false,
})

const builder = createImageUrlBuilder(sanityClient)

type SanityImageSource = Parameters<typeof builder.image>[0]

export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}

/**
 * Hero multi-états : URL Sanity haute définition (cadres variables + Retina).
 * `fit('max')` conserve le ratio. Qualité CDN élevée ; coupler avec `stagedHeroImageSizes` + `quality` sur `<Image>`.
 */
export function urlForStagedHeroImage(source: SanityImageSource) {
  return builder.image(source).width(2400).height(2400).fit('max').quality(85).auto('format')
}

/**
 * Attribut `sizes` pour `<Image>` du hero multi-états : évite une sous-estimation (flou) quand
 * les cadres sont larges ou sur écran haute densité (Next choisit la résolution à partir de `sizes`).
 */
export const stagedHeroImageSizes = '(max-width: 1200px) 100vw, min(92vw, 2400px)'

/** Tranche hero secondaire (~1/3 de la largeur utile). */
export const stagedHeroSliceImageSizes = '(max-width: 1200px) 96vw, min(40vw, 520px)'

/** `sizes` pour images du tryptique (cartes étroites). */
export const triptychCardImageSizes = '(max-width: 900px) 42vw, 30vw'

/**
 * `sizes` pour la grille catalogue : desktop ~colonnes ; mobile = slides carrées scroll (~78vw).
 */
export const catalogPuzzleImageSizes =
  '(max-width: 768px) 82vw, (max-width: 1200px) 55vw, min(45vw, min(100vw, 2000px))'

/** Demi-colonne gauche (desktop) ; mobile = même largeur de slide que les autres tuiles. */
export const catalogPuzzleQuarterImageSizes =
  '(max-width: 768px) 82vw, min(28vw, min(100vw, 1200px))'

/** Colonne droite carte haute (desktop) ; mobile = slide carrée comme le reste. */
export const catalogPuzzleTallImageSizes =
  '(max-width: 768px) 82vw, (max-width: 1200px) 55vw, min(45vw, min(100vw, 2000px))'

/** Cartes du bandeau horizontal : largeur d’affichage variable selon le format. */
export const horizontalScrollCardImageSizes =
  '(max-width: 768px) 92vw, (max-width: 1200px) 58vw, min(52vw, 680px)'

/**
 * URL catalogue : **ne pas** imposer width×height avec le même ratio que les cadres du site.
 * Avec `width` + `height` identiques (ex. 4096²), @sanity/image-url calcule un `rect` pour ce
 * ratio (ex. 1:1) : le rendu ne correspond plus au cadrage Studio, puis `object-fit: cover`
 * recadre encore dans des cellules très hautes.
 *
 * Ici : **largeur max seulement** + `fit('max')` → `rect` = zone **recadrée dans Sanity**
 * (crop), bonne définition ; le **point focal** est réappliqué côté CSS (`object-position`).
 */
export function urlForCatalogPuzzleImage(source: SanityImageSource) {
  return builder.image(source).width(1600).fit('max').quality(85).auto('format')
}

/** Point chaud Sanity (éditeur d’image) — sert à `object-position` en cover. */
export type SanityImageHotspot = {
  x?: number
  y?: number
  height?: number
  width?: number
}

export type SanityImage = {
  asset?: {
    _ref?: string
    _type?: string
    _id?: string
    url?: string
    metadata?: {
      dimensions?: {width?: number; height?: number; aspectRatio?: number}
    }
  }
  alt?: string
  hotspot?: SanityImageHotspot
  /** Recadrage Sanity (optionnel), pris en compte par le CDN avec l’URL image. */
  crop?: {top?: number; bottom?: number; left?: number; right?: number}
}

export type NavItem = {
  _key: string
  label: string
  href?: string
}

export type MotionPreset = 'none' | 'fade-up' | 'stagger'

/** Q/R saisie sur un article d’aide (objet dans `qaItems[]`). */
export type HelpArticleQaItem = {
  _key: string
  question: string
  answer?: PortableTextBlock[]
}

/**
 * Article d’aide déréférencé pour l’accordéon marketing (slugs plats pour l’URL publique).
 */
export type HelpArticleFaqBundle = {
  _id: string
  title?: string
  articleSlug?: string
  categorySlug?: string
  sectionSlug?: string | null
  qaItems?: HelpArticleQaItem[] | null
}

/** Ligne d’accordéon (article seul ou extrait d’un article référencé sur une page marketing). */
export type HelpFaqItem = {
  _key: string
  question: string
  answer?: PortableTextBlock[]
  /** Présent lorsque la ligne provient d’un article référencé (lien « article complet »). */
  helpArticleHref?: string | null
}

export type SectionBlockDualImageFormat = 'square' | 'landscape' | 'portrait'

export type SectionBlockDualRow = {
  _key: string
  /** Image à gauche (défaut) ou à droite du texte. */
  mediaPosition?: 'left' | 'right'
  /** Cadre visuel de l’image (défaut : paysage). */
  imageFormat?: SectionBlockDualImageFormat | null
  image?: SanityImage
  body?: PortableTextBlock[]
}

export type SectionDeviceVisibility = {
  /** Défaut : visible sur desktop (≥ 768 px). */
  showOnDesktop?: boolean
  /** Défaut : visible sur mobile (< 768 px). */
  showOnMobile?: boolean
}

export type HomeSection = {
  _key: string
  _type?: 'sectionBlock'
  title: string
  /** Sous-titre (même typo que le bandeau défilant) ; optionnel. */
  text?: string
  image?: SanityImage
  /** Fond pleine largeur ; optionnel. */
  backgroundColor?: string
  /** `dark` = texte noir, `light` = texte blanc (fonds foncés). */
  textOnBackground?: 'dark' | 'light'
  motionPreset?: MotionPreset
  /** Mode deux onglets + rangées image + texte par état. */
  dualTabsEnabled?: boolean
  tab1Label?: string
  tab2Label?: string
  state1Rows?: SectionBlockDualRow[] | null
  state2Rows?: SectionBlockDualRow[] | null
  /** Articles d’aide : Q/R en accordéon + lien vers chaque article. */
  helpArticleRefs?: HelpArticleFaqBundle[] | null
}

export type RichTextSection = {
  _key: string
  _type: 'richTextSection'
  heading?: string
  body: PortableTextBlock[]
  motionPreset?: MotionPreset
}

export type TwoColumnTableRow = {
  _key: string
  firstCell?: string
  secondCell?: string
}

export type TwoColumnTableSection = {
  _key: string
  _type: 'twoColumnTableSection'
  heading?: string
  intro?: string
  firstColumnHeader?: string
  secondColumnHeader?: string
  rows?: TwoColumnTableRow[] | null
  motionPreset?: MotionPreset
}

export type StatementBandSection = {
  _key: string
  _type: 'statementBand'
  eyebrow?: string
  title: string
  lead?: string
  tone?: 'default' | 'muted' | 'contrast'
  motionPreset?: MotionPreset
}

export type QuoteSection = {
  _key: string
  _type: 'quoteSection'
  body?: PortableTextBlock[]
  backgroundColor: string
  textColor?: string
  typographyPreset?: 'sans' | 'serif' | 'custom'
  fontFamilyCustom?: string
  motionPreset?: MotionPreset
}

export type SeoMetadata = {
  metaTitle?: string
  metaDescription?: string
  shareImage?: SanityImage
}

export type SanityFileAsset = {
  _ref?: string
  url?: string
  mimeType?: string
  originalFilename?: string
}

export type WebsiteHeaderNavData = {
  /** Logo Segna (SVG), fichier Sanity. */
  segnaLogo?: {
    asset?: SanityFileAsset
  }
  navItems?: NavItem[]
  primaryCta?: {
    label: string
    url: string
  }
  /** Lien texte (ex. Se connecter), à droite des liens nav. */
  secondaryCta?: {
    label: string
    url?: string
  }
}

export type WebsiteSiteSettingsData = {
  defaultSeo?: SeoMetadata | null
}

export type WebsiteFooterLink = {
  _key: string
  label: string
  href?: string
}

export type WebsiteFooterColumn = {
  _key: string
  title: string
  links?: WebsiteFooterLink[]
}

export type WebsiteFooterSocialLink = {
  _key: string
  href?: string
  label?: string
  icon?: {
    asset?: {
      url?: string
      mimeType?: string
      originalFilename?: string
    }
  } | null
}

export type WebsiteFooterData = {
  logoSvg?: {
    asset?: SanityFileAsset
  } | null
  logoImage?: SanityImage | null
  backgroundColor?: string | null
  textColor?: string | null
  columnHeadingColor?: string | null
  columns?: WebsiteFooterColumn[] | null
  copyrightLine?: string | null
  /** Icônes SVG uploadées + URL (ordre = ordre d’affichage). */
  socialLinks?: WebsiteFooterSocialLink[] | null
  /** CGU, confidentialité, etc. — rangée sous le bloc principal. */
  legalLinks?: WebsiteFooterLink[] | null
}

/** Cadre CSS éditable (bureau / mobile) pour une image du hero multi-états. */
export type HomeHeroStagedLayoutSlot = {
  top?: string
  right?: string
  bottom?: string
  left?: string
  width?: string
  height?: string
  /** Chaîne vide = hériter du réglage global de l’image. */
  objectFit?: '' | 'cover' | 'contain'
  zIndex?: number
}

/** Données `homePage` dans Sanity (hero + sections + SEO uniquement). */
export type HomeHeroStagedImage = {
  _key: string
  image?: SanityImage
  alt?: string
  objectFit?: 'cover' | 'contain'
  /** @deprecated Ancien mode CSS manuel — secours si pas de mise en page globale sur l’état. */
  top?: string
  right?: string
  bottom?: string
  left?: string
  width?: string
  height?: string
  zIndex?: number
}

/** Cadres globaux d’un état (indices alignés sur `images[]`). */
export type HomeHeroStagedStateFrameLayout = {
  framesDesktop?: HomeHeroStagedLayoutSlot[] | null
  framesMobile?: HomeHeroStagedLayoutSlot[] | null
}

export type HomeHeroStagedState = {
  _key: string
  label?: string
  backgroundColor: string
  durationMs?: number
  images?: HomeHeroStagedImage[]
  frameLayout?: HomeHeroStagedStateFrameLayout | null
}

export type TriptychCardCycleState = {
  _key: string
  backgroundColor: string
  durationMs?: number
  images?: HomeHeroStagedImage[]
  frameLayout?: HomeHeroStagedStateFrameLayout | null
}

export type TriptychCard = {
  _key: string
  presentation?: 'static_image' | 'color_cycle'
  staticImage?: SanityImage
  staticObjectFit?: 'cover' | 'contain'
  cycleStates?: TriptychCardCycleState[]
  frameTitle: string
  caption?: PortableTextBlock[]
  href?: string
}

export type TriptychSection = {
  _key: string
  _type: 'triptychSection'
  heading?: string
  cardStageTransitionMs?: number
  cards?: TriptychCard[]
  motionPreset?: MotionPreset
}

export type ThreeStepCardItem = {
  _key: string
  frameFormat?: 'portrait' | 'landscape' | 'square'
  title?: string
  /** Portable Text ; les anciens brouillons peuvent encore avoir une chaîne jusqu’à republication. */
  description?: PortableTextBlock[] | string
  image?: SanityImage
}

export type ThreeStepCardsSection = {
  _key: string
  _type: 'threeStepCardsSection'
  threeStepBandColor?: string
  /** `framed` = carte blanche ; `bare` = image + texte sans cadre. */
  threeStepCardsLayout?: 'framed' | 'bare'
  threeStepTextColor?: 'black' | 'white'
  threeStepTitle: string
  threeStepSubtitle?: string
  threeStepItems?: ThreeStepCardItem[]
  threeStepPrimaryCtaLabel?: string
  threeStepPrimaryCtaHref?: string
  threeStepSecondaryCtaLabel?: string
  threeStepSecondaryCtaHref?: string
  motionPreset?: MotionPreset
}

export type CatalogPuzzleTile = {
  title?: string
  subtitle?: string
  href?: string
  image?: SanityImage
}

export type CatalogPuzzleSection = {
  _key: string
  _type: 'catalogPuzzleSection'
  eyebrow?: string
  heading?: string
  /** Libellé du lien à droite du titre (ex. « Découvrez la sélection »). Avec `introCtaHref`. */
  introCtaLabel?: string
  /** URL du lien (interne ou https). */
  introCtaHref?: string
  lead?: string
  backgroundColor?: string
  /** `auto` = déduit de la luminosité du fond ; sinon force le jeu de couleurs du titre / chapô. */
  surfaceTheme?: 'auto' | 'light' | 'dark'
  motionPreset?: MotionPreset
  leftTop?: CatalogPuzzleTile | null
  leftMiddle?: CatalogPuzzleTile | null
  leftBottomLeft?: CatalogPuzzleTile | null
  leftBottomRight?: CatalogPuzzleTile | null
  rightTall?: CatalogPuzzleTile | null
  rightBottom?: CatalogPuzzleTile | null
}

export type HorizontalScrollCardFrameFormat = 'portrait' | 'square' | 'landscape'

export type HorizontalScrollCard = {
  _key: string
  frameFormat?: HorizontalScrollCardFrameFormat
  title?: string
  subtitle?: string
  href?: string
  image?: SanityImage
}

export type HorizontalScrollCardsSection = {
  _key: string
  _type: 'horizontalScrollCardsSection'
  heading?: string
  introCtaLabel?: string
  introCtaHref?: string
  lead?: string
  /** `light` = bandeau clair ; `dark` = bandeau sombre (texte intro inversé). */
  surfaceTheme?: 'light' | 'dark'
  motionPreset?: MotionPreset
  items?: HorizontalScrollCard[] | null
}

/** Entrée éditoriale : UUID pièce Segna + couverture Sanity optionnelle. */
export type WebsiteDbCatalogItemEntry = {
  _key: string
  itemId?: string
  coverImage?: SanityImage
  cardTitle?: string
  cardSubtitle?: string
}

export type WebsiteDbCatalogSection = {
  _key: string
  _type: 'websiteDbCatalogSection'
  /** Défaut côté site : `full_catalog` si absent (anciens contenus). */
  catalogMode?: 'full_catalog' | 'curated'
  heading?: string
  intro?: string
  introCtaLabel?: string
  introCtaHref?: string
  dbItems?: WebsiteDbCatalogItemEntry[] | null
}

export type SplitPaneContentKind = 'text' | 'image' | 'video'

export type SplitPane = {
  contentKind?: SplitPaneContentKind
  /** Cadre image / vidéo dans la colonne (paysage, carré, portrait). */
  mediaFrameFormat?: 'landscape' | 'square' | 'portrait'
  image?: SanityImage
  videoFile?: {
    asset?: {
      url?: string
      mimeType?: string
      originalFilename?: string
    }
  }
  videoUrl?: string
  /** Aperçu avant lecture (prioritaire sur la vignette YouTube si renseigné). */
  videoPoster?: SanityImage
  heading?: string
  /** Sous-titre sous le titre principal (colonne texte). */
  headingSubtitle?: string
  dualTabsEnabled?: boolean
  tab1Label?: string
  tab2Label?: string
  tab1Body?: PortableTextBlock[]
  tab2Body?: PortableTextBlock[]
  body?: PortableTextBlock[]
  /** Avec onglets : un bouton par état. */
  cta1Label?: string
  cta1Href?: string
  cta2Label?: string
  cta2Href?: string
  /** Sans onglets uniquement. */
  ctaLabel?: string
  ctaHref?: string
  /** Colonne texte : Q/R des articles d’aide référencés. */
  helpArticleRefs?: HelpArticleFaqBundle[] | null
}

export type SplitFeatureSection = {
  _key: string
  _type: 'splitFeatureSection'
  splitRatio?: '33-67' | '67-33' | '50-50'
  /** `full` = colonnes bord à bord ; `inset` = bloc deux colonnes centré avec marges (fond toujours pleine largeur). */
  contentWidth?: 'full' | 'inset'
  backgroundColor?: string
  foregroundColor?: string
  leftPane?: SplitPane
  rightPane?: SplitPane
  motionPreset?: MotionPreset
}

export type HelpCenterHubSection = {
  _key: string
  _type: 'helpCenterHubSection'
  /** Fond de la bande pleine largeur (hex). */
  hubBackgroundColor?: string
  /** `black` = texte foncé + CTA clair sur foncé ; `white` = texte clair + CTA foncé sur clair. */
  hubTextColor?: 'black' | 'white'
  hubTitle: string
  hubIntro?: string
  helpHubCtaLabel?: string
  helpHubCtaHref?: string
  /** Articles d’aide : Q/R en accordéon à droite. */
  helpArticleRefs?: HelpArticleFaqBundle[] | null
}

export type PageSection = (
  | HelpCenterHubSection
  | HomeSection
  | RichTextSection
  | TwoColumnTableSection
  | StatementBandSection
  | QuoteSection
  | TriptychSection
  | ThreeStepCardsSection
  | CatalogPuzzleSection
  | HorizontalScrollCardsSection
  | WebsiteDbCatalogSection
  | SplitFeatureSection
) &
  SectionDeviceVisibility

export type HomeHeroStagedInfoItem = {
  _key: string
  text: string
  icon?: SanityImage
}

export type HomePageDocumentData = {
  heroPresentation?: 'single_photo' | 'multi_state'
  heroStageTransitionMs?: number
  heroStates?: HomeHeroStagedState[]
  heroStagedSearchPlaceholder?: string
  heroStagedSearchButtonLabel?: string
  heroStagedInfoItems?: HomeHeroStagedInfoItem[]
  heroTitle: string
  heroSubtitle?: string
  heroImage?: SanityImage
  sections?: PageSection[]
  seo?: SeoMetadata | null
}

/** Données passées au hero : document d’accueil + header global (singleton). */
export type HomePageData = HomePageDocumentData & WebsiteHeaderNavData

export type PostData = {
  _id: string
  title: string
  slug?: {
    current?: string
  }
  publishedAt?: string
  image?: SanityImage
}

export type NewsroomPageData = {
  heroTitle: string
  heroSubtitle: string
  heroImage?: SanityImage
  introText: string
  highlightedPost?: PostData
  sections?: PageSection[]
  seo?: SeoMetadata | null
}

/** Page marketing dynamique : URL = `/${slug.current}`. */
export type MarketingPageData = {
  _id: string
  title?: string
  slug?: {current?: string}
  heroTitle: string
  heroSubtitle?: string
  heroPresentation?: 'single_photo' | 'multi_state'
  heroStageTransitionMs?: number
  heroStates?: HomeHeroStagedState[]
  heroImage?: SanityImage
  heroCtaLabel?: string
  heroCtaHref?: string
  sections?: PageSection[]
  seo?: SeoMetadata | null
}

/** Projection Portable Text (images, liens) pour blocs riches dans les sections. */
const portableTextInSection = `body[]{
  ...,
  markDefs[]{
    ...,
    _type == "link" => {
      href
    }
  },
  _type == "image" => {
    ...,
    asset->
  }
}`

/** Rangée « image + texte riche » dans le bloc texte + image (mode deux états). */
const sectionBlockDualRowGroq = `
  _key,
  mediaPosition,
  imageFormat,
  image{
    ...,
    alt,
    asset->{
      _id,
      _ref,
      url,
      metadata {
        dimensions { width, height, aspectRatio }
      }
    },
    hotspot,
    crop
  },
  body[]{
    ...,
    markDefs[]{
      ...,
      _type == "link" => {
        href
      }
    },
    _type == "image" => {
      ...,
      asset->
    }
  }`

const portableCaptionInTriptychCard = `caption[]{
  ...,
  markDefs[]{
    ...,
    _type == "link" => {
      href
    }
  },
  _type == "image" => {
    ...,
    asset->
  }
}`

/** Portable Text pour un champ nommé (onglets, etc.). */
const portableTextBlockProjection = (field: string) => `${field}[]{
  ...,
  markDefs[]{
    ...,
    _type == "link" => {
      href
    }
  },
  _type == "image" => {
    ...,
    asset->
  }
}`

/** Q/R embarquées dans un article (`qaItems[]`), projection GROQ réutilisable. */
export const helpArticleQaItemsGroq = `qaItems[]{
  _key,
  question,
  ${portableTextBlockProjection('answer')}
}`

/** Article d’aide déréférencé pour sections marketing (accordéon + liens). */
export const helpArticleFaqBundleResolvedGroq = `{
  _id,
  title,
  "articleSlug": slug.current,
  "categorySlug": category->slug.current,
  "sectionSlug": section->slug.current,
  ${helpArticleQaItemsGroq}
}`

const splitPaneGroq = `
      contentKind,
      mediaFrameFormat,
      image{
        ...,
        alt,
        asset->{
          _id,
          _ref,
          url,
          metadata {
            dimensions { width, height, aspectRatio }
          }
        },
        hotspot,
        crop
      },
      videoFile{
        asset->{
          url,
          mimeType,
          originalFilename
        }
      },
      videoUrl,
      videoPoster{
        ...,
        alt,
        asset->{
          _id,
          _ref,
          url,
          metadata {
            dimensions { width, height, aspectRatio }
          }
        },
        hotspot,
        crop
      },
      heading,
      headingSubtitle,
      dualTabsEnabled,
      tab1Label,
      tab2Label,
      ${portableTextBlockProjection('tab1Body')},
      ${portableTextBlockProjection('tab2Body')},
      ${portableTextBlockProjection('body')},
      cta1Label,
      cta1Href,
      cta2Label,
      cta2Href,
      ctaLabel,
      ctaHref,
      helpArticleRefs[]->${helpArticleFaqBundleResolvedGroq}`

const catalogPuzzleTileGroq = `
  title,
  subtitle,
  href,
  image{
    ...,
    alt,
    asset->{
      _id,
      _ref,
      url,
      metadata {
        dimensions { width, height, aspectRatio }
      }
    },
    hotspot,
    crop
  }`

const horizontalScrollItemsGroq = `items[]{
  _key,
  frameFormat,
${catalogPuzzleTileGroq}
}`

const websiteDbCatalogItemsGroq = `dbItems[]{
  _key,
  itemId,
  cardTitle,
  cardSubtitle,
  coverImage{
    ...,
    alt,
    asset->{
      _id,
      _ref,
      url,
      metadata {
        dimensions { width, height, aspectRatio }
      }
    },
    hotspot,
    crop
  }
}`

const triptychCycleStateFrameLayout = `frameLayout{
      framesDesktop[]{
        _key,
        top,
        right,
        bottom,
        left,
        width,
        height,
        objectFit,
        zIndex
      },
      framesMobile[]{
        _key,
        top,
        right,
        bottom,
        left,
        width,
        height,
        objectFit,
        zIndex
      }
    }`

/** Lignes GROQ communes pour `homeHeroStagedImage` (hero + tryptique). */
const stagedHeroImageRow = `
      _key,
      top,
      right,
      bottom,
      left,
      width,
      height,
      objectFit,
      zIndex,
      alt,
      image{
        ...,
        alt,
        asset->{
          _id,
          _ref,
          url,
          metadata {
            dimensions { width, height, aspectRatio }
          }
        },
        hotspot,
        crop
      }`

/** Lignes GROQ communes pour un cadre `homeHeroStagedLayoutSlot`. */
const stagedHeroFrameRow = `
        _key,
        top,
        right,
        bottom,
        left,
        width,
        height,
        objectFit,
        zIndex`

/** Bloc GROQ commun pour `frameLayout` (desktop + mobile) — utilisable inline ou résolu via `->`. */
const stagedHeroFrameLayoutBlock = `{
      framesDesktop[]{${stagedHeroFrameRow}},
      framesMobile[]{${stagedHeroFrameRow}}
    }`

/**
 * Projection GROQ `heroStates[]` (accueil + pages marketing multi-états).
 *
 * Accepte deux formes de membres dans le tableau :
 * - `homeHeroStagedState` : état défini inline sur la page (forme historique).
 * - `homeHeroStatePresetRef` : référence vers un document `homeHeroStatePreset`
 *   du référentiel partagé. Les champs du preset sont aplatis pour que le
 *   frontend (`HomeStagedHero`, `MarketingFullBleedHero`) voie la même forme
 *   dans les deux cas.
 */
const homeHeroStatesGroq = `heroStates[]{
    _key,
    _type,
    _type == "homeHeroStagedState" => {
      label,
      backgroundColor,
      durationMs,
      frameLayout${stagedHeroFrameLayoutBlock},
      images[]{${stagedHeroImageRow}}
    },
    _type == "homeHeroStatePresetRef" => preset->{
      "label": coalesce(label, title),
      backgroundColor,
      durationMs,
      "frameLayout": frameLayout${stagedHeroFrameLayoutBlock},
      "images": coalesce(images, [])[]{${stagedHeroImageRow}}
    }
  }`

const threeStepCardItemsGroq = `threeStepItems[]{
  _key,
  frameFormat,
  title,
  ${portableTextBlockProjection('description')},
  image{
    ...,
    alt,
    asset->{
      _id,
      _ref,
      url,
      metadata {
        dimensions { width, height, aspectRatio }
      }
    },
    hotspot,
    crop
  }
}`

/** Blocs `sections[]` partagés (accueil, newsroom, pages marketing). */
const documentPageSectionsGroq = `sections[]{
        _key,
        _type,
        showOnDesktop,
        showOnMobile,
        hubTitle,
        hubIntro,
        hubBackgroundColor,
        hubTextColor,
        helpHubCtaLabel,
        helpHubCtaHref,
        helpArticleRefs[]->${helpArticleFaqBundleResolvedGroq},
        threeStepBandColor,
        threeStepCardsLayout,
        threeStepTextColor,
        threeStepTitle,
        threeStepSubtitle,
        threeStepPrimaryCtaLabel,
        threeStepPrimaryCtaHref,
        threeStepSecondaryCtaLabel,
        threeStepSecondaryCtaHref,
        ${threeStepCardItemsGroq},
        eyebrow,
        lead,
        tone,
        title,
        text,
        textOnBackground,
        motionPreset,
        backgroundColor,
        textColor,
        typographyPreset,
        fontFamilyCustom,
        cardStageTransitionMs,
        cards[]{
          _key,
          frameTitle,
          ${portableCaptionInTriptychCard},
          href,
          presentation,
          staticObjectFit,
          staticImage{
            ...,
            alt,
            asset->{
              _id,
              _ref,
              url,
              metadata {
                dimensions { width, height, aspectRatio }
              }
            },
            hotspot,
            crop
          },
          cycleStates[]{
            _key,
            backgroundColor,
            durationMs,
            images[]{${stagedHeroImageRow}},
            ${triptychCycleStateFrameLayout}
          }
        },
        image{
          ...,
          alt
        },
        heading,
        catalogMode,
        intro,
        introCtaLabel,
        introCtaHref,
        ${portableTextInSection},
        firstColumnHeader,
        secondColumnHeader,
        rows[]{
          _key,
          firstCell,
          secondCell
        },
        splitRatio,
        contentWidth,
        backgroundColor,
        foregroundColor,
        leftPane{
          ${splitPaneGroq}
        },
        rightPane{
          ${splitPaneGroq}
        },
        leftTop{${catalogPuzzleTileGroq}},
        leftMiddle{${catalogPuzzleTileGroq}},
        leftBottomLeft{${catalogPuzzleTileGroq}},
        leftBottomRight{${catalogPuzzleTileGroq}},
        rightTall{${catalogPuzzleTileGroq}},
        rightBottom{${catalogPuzzleTileGroq}},
        surfaceTheme,
        ${horizontalScrollItemsGroq},
        ${websiteDbCatalogItemsGroq},
        dualTabsEnabled,
        tab1Label,
        tab2Label,
        state1Rows[]{${sectionBlockDualRowGroq}},
        state2Rows[]{${sectionBlockDualRowGroq}},
        helpArticleRefs[]->${helpArticleFaqBundleResolvedGroq}
      }`

const homePageProjection = `{
  seo,
  heroPresentation,
  heroStageTransitionMs,
  ${homeHeroStatesGroq},
  heroStagedSearchPlaceholder,
  heroStagedSearchButtonLabel,
  heroStagedInfoItems[]{
    _key,
    text,
    icon{
      ...,
      asset->{
        _id,
        _ref,
        url,
        metadata { dimensions { width, height } }
      }
    }
  },
  heroTitle,
  heroSubtitle,
  heroImage{
    ...,
    alt
  },
  ${documentPageSectionsGroq}
}`

const headerNavProjection = `{
  segnaLogo{
    asset->{
      url,
      mimeType,
      originalFilename
    }
  },
  secondaryCta,
  primaryCta,
  navItems[]{
    _key,
    label,
    href
  }
}`

const websiteFooterProjection = `{
  logoSvg{
    asset->{
      url,
      mimeType,
      originalFilename
    }
  },
  logoImage{
    ...,
    alt,
    asset->{
      _id,
      _ref,
      url,
      metadata {
        dimensions { width, height, aspectRatio }
      }
    },
    hotspot,
    crop
  },
  backgroundColor,
  textColor,
  columnHeadingColor,
  copyrightLine,
  socialLinks[]{
    _key,
    href,
    label,
    icon{
      asset->{
        url,
        mimeType,
        originalFilename
      }
    }
  },
  legalLinks[]{
    _key,
    label,
    href
  },
  columns[]{
    _key,
    title,
    links[]{
      _key,
      label,
      href
    }
  }
}`

function combineHomeWithHeader(
  home: HomePageDocumentData | null,
  siteNav: WebsiteHeaderNavData | null | undefined,
): HomePageData | null {
  if (!home) return null
  return {
    ...home,
    segnaLogo: siteNav?.segnaLogo,
    navItems: siteNav?.navItems,
    primaryCta: siteNav?.primaryCta,
    secondaryCta: siteNav?.secondaryCta,
  }
}

async function getHomePageDataUncached(): Promise<HomePageData | null> {
  const [home, siteNav] = await Promise.all([
    sanityClient.fetch<HomePageDocumentData | null>(
      `*[_type == "homePage"]|order(_updatedAt desc)[0]${homePageProjection}`,
    ),
    sanityClient.fetch<WebsiteHeaderNavData | null>(
      `*[_type == "websiteHeaderNav"]|order(_updatedAt desc)[0]${headerNavProjection}`,
    ),
  ])

  return combineHomeWithHeader(home, siteNav)
}

/** Header global seul (ex. autres pages marketing plus tard). */
async function getWebsiteHeaderNavUncached(): Promise<WebsiteHeaderNavData | null> {
  return sanityClient.fetch(`*[_type == "websiteHeaderNav"]|order(_updatedAt desc)[0]${headerNavProjection}`)
}

async function getWebsiteSiteSettingsUncached(): Promise<WebsiteSiteSettingsData | null> {
  return sanityClient.fetch(`*[_type == "websiteSiteSettings"]|order(_updatedAt desc)[0]{
    defaultSeo{
      metaTitle,
      metaDescription,
      shareImage{
        ...,
        alt
      }
    }
  }`)
}

/** Pied de page global (document unique recommandé : id `websiteFooter` dans le desk). */
async function getWebsiteFooterUncached(): Promise<WebsiteFooterData | null> {
  return sanityClient.fetch(`*[_type == "websiteFooter"]|order(_updatedAt desc)[0]${websiteFooterProjection}`)
}

async function getNewsroomPageDataUncached(): Promise<NewsroomPageData | null> {
  return sanityClient.fetch(
    `*[_type == "newsroomPage"]|order(_updatedAt desc)[0]{
      seo,
      heroTitle,
      heroSubtitle,
      heroImage{
        ...,
        alt
      },
      introText,
      highlightedPost->{
        _id,
        title,
        slug,
        publishedAt,
        image{
          ...,
          alt
        }
      },
      ${documentPageSectionsGroq}
    }`,
  )
}

async function getMarketingPageSlugsUncached(): Promise<string[]> {
  const slugs = await sanityClient.fetch<string[] | null>(
    `*[_type == "marketingPage" && defined(slug.current)].slug.current`,
  )
  const fromCms = (slugs ?? []).filter((s): s is string => Boolean(s && String(s).trim()))
  return [...new Set(fromCms)]
}

export const getHomePageData = cache(
  unstable_cache(getHomePageDataUncached, ['sanity_home_page_v1'], sanityCacheOptions),
)

export const getWebsiteHeaderNav = cache(
  unstable_cache(getWebsiteHeaderNavUncached, ['sanity_header_nav_v1'], sanityCacheOptions),
)

export const getWebsiteSiteSettings = cache(
  unstable_cache(getWebsiteSiteSettingsUncached, ['sanity_site_settings_v1'], sanityCacheOptions),
)

export const getWebsiteFooter = cache(
  unstable_cache(getWebsiteFooterUncached, ['sanity_footer_v1'], sanityCacheOptions),
)

export const getNewsroomPageData = cache(
  unstable_cache(getNewsroomPageDataUncached, ['sanity_newsroom_page_v1'], sanityCacheOptions),
)

export const getMarketingPageSlugs = cache(
  unstable_cache(getMarketingPageSlugsUncached, ['sanity_marketing_slugs_v1'], sanityCacheOptions),
)

export type CatalogBrandEditorial = {
  headline: string | null
  description: PortableTextBlock[] | null
}

/** Contenu éditorial catalogue pour une marque (`catalogBrandPage.brandSlug` = `item_brands.slug`). */
async function getCatalogBrandEditorialBySlugUncached(slug: string): Promise<CatalogBrandEditorial | null> {
  const normalized = slug.trim().toLowerCase()
  if (!normalized) return null
  return sanityClient.fetch<CatalogBrandEditorial | null>(
    `*[_type == "catalogBrandPage" && lower(brandSlug) == $slug][0]{headline, description}`,
    {slug: normalized},
  )
}

async function getMarketingPageBySlugUncached(slug: string): Promise<MarketingPageData | null> {
  const normalized = slug.trim()
  if (!normalized) return null
  return sanityClient.fetch<MarketingPageData | null>(
    `*[_type == "marketingPage" && slug.current == $slug][0]{
      _id,
      title,
      slug,
      seo,
      heroTitle,
      heroSubtitle,
      heroImage{
        ...,
        alt,
        asset->{
          _id,
          _ref,
          url,
          metadata {
            dimensions { width, height, aspectRatio }
          }
        },
        hotspot,
        crop
      },
      heroCtaLabel,
      heroCtaHref,
      heroPresentation,
      heroStageTransitionMs,
      ${homeHeroStatesGroq},
      ${documentPageSectionsGroq}
    }`,
    {slug: normalized},
  )
}

async function getPostsUncached(): Promise<PostData[]> {
  return sanityClient.fetch(
    `*[_type == "post"]|order(publishedAt desc){
      _id,
      title,
      slug,
      publishedAt,
      image{
        ...,
        alt
      }
    }`,
  )
}

const getCatalogBrandEditorialBySlugCrossRequest = unstable_cache(
  getCatalogBrandEditorialBySlugUncached,
  ['sanity_catalog_brand_editorial_v1'],
  sanityCacheOptions,
)

const getMarketingPageBySlugCrossRequest = unstable_cache(
  getMarketingPageBySlugUncached,
  ['sanity_marketing_page_v1'],
  sanityCacheOptions,
)

const getPostsCrossRequest = unstable_cache(getPostsUncached, ['sanity_posts_v1'], sanityCacheOptions)

export const getCatalogBrandEditorialBySlug = cache(getCatalogBrandEditorialBySlugCrossRequest)

export const getMarketingPageBySlug = cache(getMarketingPageBySlugCrossRequest)

export const getPosts = cache(getPostsCrossRequest)

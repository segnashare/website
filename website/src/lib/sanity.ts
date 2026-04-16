import {createClient} from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'
import type {PortableTextBlock} from '@portabletext/types'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? '1qxhnoe8'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01'

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  // Disable CDN to reduce propagation delay after CMS updates.
  useCdn: false,
})

const builder = imageUrlBuilder(sanityClient)

type SanityImageSource = Parameters<typeof builder.image>[0]

export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}

/**
 * Hero multi-états : URL Sanity haute définition (cadres variables + Retina).
 * `fit('max')` conserve le ratio. Qualité CDN élevée ; coupler avec `stagedHeroImageSizes` + `quality` sur `<Image>`.
 */
export function urlForStagedHeroImage(source: SanityImageSource) {
  return builder.image(source).width(5760).height(5760).fit('max').quality(96).auto('format')
}

/**
 * Attribut `sizes` pour `<Image>` du hero multi-états : évite une sous-estimation (flou) quand
 * les cadres sont larges ou sur écran haute densité (Next choisit la résolution à partir de `sizes`).
 */
export const stagedHeroImageSizes = '(max-width: 1024px) 100vw, min(92vw, 2400px)'

/** Tranche hero secondaire (~1/3 de la largeur utile). */
export const stagedHeroSliceImageSizes = '(max-width: 1024px) 96vw, min(40vw, 520px)'

/** `sizes` pour images du tryptique (cartes étroites). */
export const triptychCardImageSizes = '(max-width: 900px) 42vw, 30vw'

/**
 * `sizes` pour la grille catalogue : valeurs généreuses (Retina) pour éviter
 * que Next ne choisisse une variante trop petite — les cadres sont larges (~40–45 % du viewport).
 */
export const catalogPuzzleImageSizes =
  '(max-width: 768px) 96vw, (max-width: 1200px) 55vw, min(45vw, min(100vw, 2000px))'

/** Demi-colonne gauche (deux cartes du bas) : ~½ de la colonne ≈ 20–22 % du viewport. */
export const catalogPuzzleQuarterImageSizes =
  '(max-width: 768px) 48vw, min(28vw, min(100vw, 1200px))'

/** Colonne droite, carte très haute : même largeur affichée que la demi-grille, hauteur plus grande (même `sizes` = largeur). */
export const catalogPuzzleTallImageSizes =
  '(max-width: 768px) 96vw, (max-width: 1200px) 55vw, min(45vw, min(100vw, 2000px))'

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
  return builder.image(source).width(4096).fit('max').quality(96).auto('format')
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

export type HomeSection = {
  _key: string
  _type?: 'sectionBlock'
  title: string
  text: string
  image?: SanityImage
  motionPreset?: MotionPreset
}

export type RichTextSection = {
  _key: string
  _type: 'richTextSection'
  heading?: string
  body: PortableTextBlock[]
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
  lead?: string
  backgroundColor?: string
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
  lead?: string
  /** Fond blanc + texte foncé, ou fond noir + texte clair (titres intro). */
  surfaceTheme?: 'light' | 'dark'
  backgroundColor?: string
  motionPreset?: MotionPreset
  items?: HorizontalScrollCard[] | null
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
  hubTitle: string
  hubIntro?: string
  helpHubCtaLabel?: string
  helpHubCtaHref?: string
  helpHubNote?: string
}

export type PageSection =
  | HelpCenterHubSection
  | HomeSection
  | RichTextSection
  | StatementBandSection
  | QuoteSection
  | TriptychSection
  | CatalogPuzzleSection
  | HorizontalScrollCardsSection
  | SplitFeatureSection

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
  introText?: string
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
      ctaHref`

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

/** Projection GROQ `heroStates[]` (accueil + pages marketing multi-états). */
const homeHeroStatesGroq = `heroStates[]{
    _key,
    label,
    backgroundColor,
    durationMs,
    frameLayout{
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
    },
    images[]{${stagedHeroImageRow}}
  }`

/** Blocs `sections[]` partagés (accueil, newsroom, pages marketing). */
const documentPageSectionsGroq = `sections[]{
        _key,
        _type,
        hubTitle,
        hubIntro,
        helpHubCtaLabel,
        helpHubCtaHref,
        helpHubNote,
        eyebrow,
        lead,
        tone,
        title,
        text,
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
        ${portableTextInSection},
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
        ${horizontalScrollItemsGroq}
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

export async function getHomePageData(): Promise<HomePageData | null> {
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
export async function getWebsiteHeaderNav(): Promise<WebsiteHeaderNavData | null> {
  return sanityClient.fetch(`*[_type == "websiteHeaderNav"]|order(_updatedAt desc)[0]${headerNavProjection}`)
}

export async function getWebsiteSiteSettings(): Promise<WebsiteSiteSettingsData | null> {
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

export async function getNewsroomPageData(): Promise<NewsroomPageData | null> {
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

const MAIN_MARKETING_SLUGS = ['catalogue', 'communaute', 'mission-impact', 'comment-ca-marche'] as const

export async function getMarketingPageSlugs(): Promise<string[]> {
  const slugs = await sanityClient.fetch<string[] | null>(
    `*[_type == "marketingPage" && defined(slug.current)].slug.current`,
  )
  const fromCms = (slugs ?? []).filter((s): s is string => Boolean(s && String(s).trim()))
  return [...new Set([...MAIN_MARKETING_SLUGS, ...fromCms])]
}

export async function getMarketingPageBySlug(slug: string): Promise<MarketingPageData | null> {
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
      introText,
      ${documentPageSectionsGroq}
    }`,
    {slug: normalized},
  )
}

export async function getPosts(): Promise<PostData[]> {
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

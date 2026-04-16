import {sanityClient} from '@/lib/sanity'

export type HelpCenterSettingsData = {
  landingHeroTitle?: string
  landingHeroSubtitle?: string
  headerBrandLabel?: string
  headerHelpLabel?: string
  homeLinkHref?: string
  searchPlaceholder?: string
  searchResultsTitle?: string
  accentHex?: string
  footerCtaQuestion?: string
  footerCtaLinkLabel?: string
  footerCtaHref?: string
}

export type HelpCategoryListItem = {
  _id: string
  title: string
  slug?: {current?: string}
  description?: string
}

export type HelpSectionListItem = {
  _id: string
  title: string
  slug?: {current?: string}
  description?: string
}

export type HelpArticleRef = {
  _id: string
  title: string
  slug?: {current?: string}
  excerpt?: string
  isFeatured?: boolean
  sortOrder?: number
}

export type HelpCategoryPageData = {
  _id: string
  title: string
  slug?: {current?: string}
  /** Sous-sections (niveau 2) */
  sections: HelpSectionListItem[]
  /** Articles sans sous-section (comportement historique) */
  rootArticles: HelpArticleRef[]
}

export type HelpSubsectionPageData = {
  _id: string
  title: string
  slug?: {current?: string}
  description?: string
  articles: HelpArticleRef[]
  category?: {
    _id: string
    title?: string
    slug?: {current?: string}
  }
}

export type HelpArticlePageData = {
  _id: string
  title: string
  slug?: {current?: string}
  excerpt?: string
  isFeatured?: boolean
  lastUpdated?: string
  body?: unknown[]
  category?: {
    _id: string
    title?: string
    slug?: {current?: string}
  }
  section?: {
    _id: string
    title?: string
    slug?: {current?: string}
  } | null
}

export type HelpSearchHit = {
  _id: string
  title: string
  slug?: {current?: string}
  excerpt?: string
  category?: {
    title?: string
    slug?: {current?: string}
  }
  section?: {
    title?: string
    slug?: {current?: string}
  } | null
}

const settingsProjection = `{
  landingHeroTitle,
  landingHeroSubtitle,
  headerBrandLabel,
  headerHelpLabel,
  homeLinkHref,
  searchPlaceholder,
  searchResultsTitle,
  accentHex,
  footerCtaQuestion,
  footerCtaLinkLabel,
  footerCtaHref
}`

export async function getHelpCenterSettings(): Promise<HelpCenterSettingsData | null> {
  return sanityClient.fetch(`*[_type == "helpCenterSettings"]|order(_updatedAt desc)[0]${settingsProjection}`)
}

export async function getHelpCategoriesForHome(): Promise<HelpCategoryListItem[]> {
  return sanityClient.fetch(
    `*[_type == "helpCategory" && (showOnHome != false)]|order(sortOrder asc, title asc){
      _id,
      title,
      slug,
      description
    }`
  )
}

/** Toutes les sections d’aide (liens vers /aide/{slug}) — ex. bloc sur page « Comment ça marche ». */
export async function getHelpCategoriesForHub(): Promise<HelpCategoryListItem[]> {
  return sanityClient.fetch(
    `*[_type == "helpCategory"]|order(sortOrder asc, title asc){
      _id,
      title,
      slug,
      description
    }`,
  )
}

export async function getHelpCategoryBySlug(categorySlug: string): Promise<HelpCategoryPageData | null> {
  return sanityClient.fetch(
    `*[_type == "helpCategory" && slug.current == $categorySlug][0]{
      _id,
      title,
      slug,
      "sections": *[_type == "helpSection" && category._ref == ^._id]|order(sortOrder asc, title asc){
        _id,
        title,
        slug,
        description
      },
      "rootArticles": *[_type == "helpArticle" && category._ref == ^._id && !defined(section)]|order(sortOrder asc, title asc){
        _id,
        title,
        slug,
        excerpt,
        isFeatured,
        sortOrder
      }
    }`,
    {categorySlug}
  )
}

export async function getHelpSubsectionBySlugs(
  categorySlug: string,
  subsectionSlug: string
): Promise<HelpSubsectionPageData | null> {
  return sanityClient.fetch(
    `*[_type == "helpSection" && slug.current == $subsectionSlug && category->slug.current == $categorySlug][0]{
      _id,
      title,
      slug,
      description,
      category->{
        _id,
        title,
        slug
      },
      "articles": *[_type == "helpArticle" && section._ref == ^._id]|order(sortOrder asc, title asc){
        _id,
        title,
        slug,
        excerpt,
        isFeatured,
        sortOrder
      }
    }`,
    {categorySlug, subsectionSlug}
  )
}

/** Article à la racine de la section : /aide/{section}/{article} */
export async function getHelpRootArticleBySlugs(
  categorySlug: string,
  articleSlug: string
): Promise<HelpArticlePageData | null> {
  const article = await sanityClient.fetch(
    `*[_type == "helpArticle" && slug.current == $articleSlug && !defined(section)][0]{
      _id,
      title,
      slug,
      excerpt,
      isFeatured,
      lastUpdated,
      body,
      category->{
        _id,
        title,
        slug
      },
      section->{
        _id,
        title,
        slug
      }
    }`,
    {articleSlug}
  )
  if (!article) return null
  if (article.category?.slug?.current !== categorySlug) return null
  return article as HelpArticlePageData
}

/** Article sous sous-section : /aide/{section}/{subsection}/{article} */
export async function getHelpNestedArticleBySlugs(
  categorySlug: string,
  subsectionSlug: string,
  articleSlug: string
): Promise<HelpArticlePageData | null> {
  const article = await sanityClient.fetch(
    `*[_type == "helpArticle" && slug.current == $articleSlug][0]{
      _id,
      title,
      slug,
      excerpt,
      isFeatured,
      lastUpdated,
      body,
      category->{
        _id,
        title,
        slug
      },
      section->{
        _id,
        title,
        slug
      }
    }`,
    {articleSlug}
  )
  if (!article) return null
  if (article.category?.slug?.current !== categorySlug) return null
  if (article.section?.slug?.current !== subsectionSlug) return null
  if (!article.section) return null
  return article as HelpArticlePageData
}

function groqMatchPattern(raw: string): string | null {
  const t = raw.trim()
  if (t.length < 2) return null
  const safe = t.replace(/[*"'\\]/g, ' ').trim()
  if (safe.length < 2) return null
  return `*${safe}*`
}

export async function searchHelpArticles(query: string): Promise<HelpSearchHit[]> {
  const pattern = groqMatchPattern(query)
  if (!pattern) return []
  return sanityClient.fetch(
    `*[_type == "helpArticle" && (title match $pattern || excerpt match $pattern)]|order(title asc){
      _id,
      title,
      slug,
      excerpt,
      category->{
        title,
        slug
      },
      section->{
        title,
        slug
      }
    }`,
    {pattern}
  )
}

/** URL publique d’un article d’aide */
export function helpArticleHref(hit: Pick<HelpSearchHit, 'category' | 'section' | 'slug'>): string | null {
  const catSlug = hit.category?.slug?.current
  const artSlug = hit.slug?.current
  if (!catSlug || !artSlug) return null
  const subSlug = hit.section?.slug?.current
  if (subSlug) return `/aide/${catSlug}/${subSlug}/${artSlug}`
  return `/aide/${catSlug}/${artSlug}`
}

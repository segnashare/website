import {helpArticleQaItemsGroq, sanityClient, type HelpArticleQaItem} from '@/lib/sanity'
import {cache} from 'react'

export type HelpCenterSettingsData = {
  landingHeroTitle?: string
  landingHeroSubtitle?: string
  headerBrandLabel?: string
  headerHelpLabel?: string
  searchPlaceholder?: string
  searchResultsTitle?: string
  accentHex?: string
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
  qaItems?: HelpArticleQaItem[] | null
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
  searchPlaceholder,
  searchResultsTitle,
  accentHex
}`

export const getHelpCenterSettings = cache(async (): Promise<HelpCenterSettingsData | null> => {
  return sanityClient.fetch(`*[_type == "helpCenterSettings"]|order(_updatedAt desc)[0]${settingsProjection}`)
})

export const getHelpCategoriesForHome = cache(async (): Promise<HelpCategoryListItem[]> => {
  return sanityClient.fetch(
    `*[_type == "helpCategory" && (showOnHome != false)]|order(sortOrder asc, title asc){
      _id,
      title,
      slug,
      description
    }`
  )
})

/** Toutes les sections d’aide (liens vers /aide/{slug}) — ex. bloc sur page « Comment ça marche ». */
export const getHelpCategoriesForHub = cache(async (): Promise<HelpCategoryListItem[]> => {
  return sanityClient.fetch(
    `*[_type == "helpCategory"]|order(sortOrder asc, title asc){
      _id,
      title,
      slug,
      description
    }`,
  )
})

export const getHelpCategoryBySlug = cache(async (categorySlug: string): Promise<HelpCategoryPageData | null> => {
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
})

export const getHelpSubsectionBySlugs = cache(async (
  categorySlug: string,
  subsectionSlug: string
): Promise<HelpSubsectionPageData | null> => {
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
})

/** Article à la racine de la section : /aide/{section}/{article} */
export const getHelpRootArticleBySlugs = cache(async (
  categorySlug: string,
  articleSlug: string
): Promise<HelpArticlePageData | null> => {
  const article = await sanityClient.fetch(
    `*[_type == "helpArticle" && slug.current == $articleSlug && !defined(section)][0]{
      _id,
      title,
      slug,
      excerpt,
      isFeatured,
      lastUpdated,
      body,
      ${helpArticleQaItemsGroq},
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
})

/** Article sous sous-section : /aide/{section}/{subsection}/{article} */
export const getHelpNestedArticleBySlugs = cache(async (
  categorySlug: string,
  subsectionSlug: string,
  articleSlug: string
): Promise<HelpArticlePageData | null> => {
  const article = await sanityClient.fetch(
    `*[_type == "helpArticle" && slug.current == $articleSlug][0]{
      _id,
      title,
      slug,
      excerpt,
      isFeatured,
      lastUpdated,
      body,
      ${helpArticleQaItemsGroq},
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
})

function groqMatchPattern(raw: string): string | null {
  const t = raw.trim()
  if (t.length < 2) return null
  const safe = t.replace(/[*"'\\]/g, ' ').trim()
  if (safe.length < 2) return null
  return `*${safe}*`
}

export const searchHelpArticles = cache(async (query: string): Promise<HelpSearchHit[]> => {
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
})

/** URL publique à partir des slugs (catégorie, sous-section optionnelle, article). */
export function helpArticleHrefFromSlugs(
  categorySlug?: string | null,
  subsectionSlug?: string | null,
  articleSlug?: string | null,
): string | null {
  const cat = categorySlug?.trim()
  const art = articleSlug?.trim()
  if (!cat || !art) return null
  const sub = subsectionSlug?.trim()
  if (sub) return `/aide/${cat}/${sub}/${art}`
  return `/aide/${cat}/${art}`
}

/** URL publique d’un article d’aide */
export function helpArticleHref(hit: Pick<HelpSearchHit, 'category' | 'section' | 'slug'>): string | null {
  return helpArticleHrefFromSlugs(
    hit.category?.slug?.current,
    hit.section?.slug?.current,
    hit.slug?.current,
  )
}

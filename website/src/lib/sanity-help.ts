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
  articles: HelpArticleRef[]
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

export async function getHelpCategoryBySlug(categorySlug: string): Promise<HelpCategoryPageData | null> {
  return sanityClient.fetch(
    `*[_type == "helpCategory" && slug.current == $categorySlug][0]{
      _id,
      title,
      slug,
      "articles": *[_type == "helpArticle" && category._ref == ^._id]|order(sortOrder asc, title asc){
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

export async function getHelpArticleBySlugs(
  categorySlug: string,
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
      }
    }`,
    {articleSlug}
  )
  if (!article) return null
  if (article.category?.slug?.current !== categorySlug) return null
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
      }
    }`,
    {pattern}
  )
}

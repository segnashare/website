import type {HelpArticleFaqBundle, HelpArticleQaItem} from '@/lib/sanity'
import {faqSanityClient} from '@/lib/sanity-faq'
import {sanityCacheOptions, withDataCache} from '@/lib/sanity-cache'
import {cache} from 'react'

const HELP_SITE_URL = (process.env.NEXT_PUBLIC_HELP_SITE_URL || 'https://help.segnashare.com').replace(
  /\/+$/,
  '',
)

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

const helpArticleQaItemsGroq = `qaItems[]{
  _key,
  question,
  ${portableTextBlockProjection('answer')}
}`

const helpArticleFaqBundleGroq = `{
  _id,
  title,
  "articleSlug": slug.current,
  "categorySlug": category->slug.current,
  "sectionSlug": section->slug.current,
  ${helpArticleQaItemsGroq}
}`

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

async function getHelpCenterSettingsUncached(): Promise<HelpCenterSettingsData | null> {
  return faqSanityClient.fetch(`*[_type == "helpCenterSettings"]|order(_updatedAt desc)[0]${settingsProjection}`)
}

async function getHelpCategoriesForHomeUncached(): Promise<HelpCategoryListItem[]> {
  return faqSanityClient.fetch(
    `*[_type == "helpCategory" && (showOnHome != false)]|order(sortOrder asc, title asc){
      _id,
      title,
      slug,
      description
    }`
  )
}

/** Toutes les sections d’aide (liens vers /aide/{slug}) — ex. bloc sur page « Comment ça marche ». */
async function getHelpCategoriesForHubUncached(): Promise<HelpCategoryListItem[]> {
  return faqSanityClient.fetch(
    `*[_type == "helpCategory"]|order(sortOrder asc, title asc){
      _id,
      title,
      slug,
      description
    }`,
  )
}

async function getHelpCategoryBySlugUncached(categorySlug: string): Promise<HelpCategoryPageData | null> {
  return faqSanityClient.fetch(
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

async function getHelpSubsectionBySlugsUncached(
  categorySlug: string,
  subsectionSlug: string
): Promise<HelpSubsectionPageData | null> {
  return faqSanityClient.fetch(
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
async function getHelpRootArticleBySlugsUncached(
  categorySlug: string,
  articleSlug: string
): Promise<HelpArticlePageData | null> {
  const article = await faqSanityClient.fetch(
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
}

/** Article sous sous-section : /aide/{section}/{subsection}/{article} */
async function getHelpNestedArticleBySlugsUncached(
  categorySlug: string,
  subsectionSlug: string,
  articleSlug: string
): Promise<HelpArticlePageData | null> {
  const article = await faqSanityClient.fetch(
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
}

export const getHelpCenterSettings = cache(
  withDataCache(getHelpCenterSettingsUncached, ['sanity_help_settings_v1'], sanityCacheOptions),
)

export const getHelpCategoriesForHome = cache(
  withDataCache(getHelpCategoriesForHomeUncached, ['sanity_help_categories_home_v1'], sanityCacheOptions),
)

export const getHelpCategoriesForHub = cache(
  withDataCache(getHelpCategoriesForHubUncached, ['sanity_help_categories_hub_v1'], sanityCacheOptions),
)

export const getHelpCategoryBySlug = cache(
  withDataCache(getHelpCategoryBySlugUncached, ['sanity_help_category_v1'], sanityCacheOptions),
)

export const getHelpSubsectionBySlugs = cache(
  withDataCache(getHelpSubsectionBySlugsUncached, ['sanity_help_subsection_v1'], sanityCacheOptions),
)

export const getHelpRootArticleBySlugs = cache(
  withDataCache(getHelpRootArticleBySlugsUncached, ['sanity_help_root_article_v1'], sanityCacheOptions),
)

export const getHelpNestedArticleBySlugs = cache(
  withDataCache(getHelpNestedArticleBySlugsUncached, ['sanity_help_nested_article_v1'], sanityCacheOptions),
)

function groqMatchPattern(raw: string): string | null {
  const t = raw.trim()
  if (t.length < 2) return null
  const safe = t.replace(/[*"'\\]/g, ' ').trim()
  if (safe.length < 2) return null
  return `*${safe}*`
}

async function searchHelpArticlesUncached(query: string): Promise<HelpSearchHit[]> {
  const pattern = groqMatchPattern(query)
  if (!pattern) return []
  return faqSanityClient.fetch(
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

export const searchHelpArticles = cache(
  withDataCache(searchHelpArticlesUncached, ['sanity_help_search_v1'], sanityCacheOptions),
)

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
  if (sub) return `${HELP_SITE_URL}/${cat}/${sub}/${art}`
  return `${HELP_SITE_URL}/${cat}/${art}`
}

/** URL publique d’un article d’aide */
export function helpArticleHref(hit: Pick<HelpSearchHit, 'category' | 'section' | 'slug'>): string | null {
  return helpArticleHrefFromSlugs(
    hit.category?.slug?.current,
    hit.section?.slug?.current,
    hit.slug?.current,
  )
}

function normalizeHelpArticlePaths(raw: string[] | null | undefined): string[] {
  if (!raw?.length) return []
  return [...new Set(raw.map((p) => p.trim()).filter(Boolean))]
}

function helpArticlePathFromBundle(bundle: HelpArticleFaqBundle): string | null {
  const cat = bundle.categorySlug?.trim()
  const art = bundle.articleSlug?.trim()
  if (!cat || !art) return null
  const sub = bundle.sectionSlug?.trim()
  if (sub) return `${cat}/${sub}/${art}`
  return `${cat}/${art}`
}

/** Résout des chemins FAQ (ex. `compte/connexion`) depuis le projet Sanity dédié. */
export async function resolveHelpArticleFaqBundles(
  paths: string[] | null | undefined,
): Promise<HelpArticleFaqBundle[]> {
  const normalized = normalizeHelpArticlePaths(paths)
  if (!normalized.length) return []

  return faqSanityClient.fetch(
    `*[_type == "helpArticle" && (
      (!defined(section) && category->slug.current + "/" + slug.current in $paths)
      || (defined(section) && category->slug.current + "/" + section->slug.current + "/" + slug.current in $paths)
    )]|order(title asc)${helpArticleFaqBundleGroq}`,
    {paths: normalized},
  )
}

type FaqPaneLike = {
  helpArticlePaths?: string[] | null
  helpArticleRefs?: HelpArticleFaqBundle[] | null
}

type FaqSectionLike = FaqPaneLike & {
  leftPane?: FaqPaneLike | null
  rightPane?: FaqPaneLike | null
}

function collectHelpArticlePaths(sections: FaqSectionLike[] | null | undefined): string[] {
  const paths: string[] = []
  for (const section of sections ?? []) {
    paths.push(...normalizeHelpArticlePaths(section.helpArticlePaths))
    paths.push(...normalizeHelpArticlePaths(section.leftPane?.helpArticlePaths))
    paths.push(...normalizeHelpArticlePaths(section.rightPane?.helpArticlePaths))
  }
  return [...new Set(paths)]
}

function assignFaqBundlesToPane<T extends FaqPaneLike>(
  pane: T | null | undefined,
  bundlesByPath: Map<string, HelpArticleFaqBundle>,
): T | null | undefined {
  if (!pane) return pane
  const paths = normalizeHelpArticlePaths(pane.helpArticlePaths)
  if (!paths.length) return {...pane, helpArticleRefs: null}
  const bundles = paths
    .map((path) => bundlesByPath.get(path))
    .filter((bundle): bundle is HelpArticleFaqBundle => Boolean(bundle))
  return {...pane, helpArticleRefs: bundles.length ? bundles : null}
}

function assignFaqBundlesToSection<T extends FaqSectionLike>(
  section: T,
  bundlesByPath: Map<string, HelpArticleFaqBundle>,
): T {
  const paths = normalizeHelpArticlePaths(section.helpArticlePaths)
  const sectionBundles = paths
    .map((path) => bundlesByPath.get(path))
    .filter((bundle): bundle is HelpArticleFaqBundle => Boolean(bundle))

  return {
    ...section,
    helpArticleRefs: sectionBundles.length ? sectionBundles : null,
    leftPane: assignFaqBundlesToPane(section.leftPane, bundlesByPath) ?? section.leftPane,
    rightPane: assignFaqBundlesToPane(section.rightPane, bundlesByPath) ?? section.rightPane,
  }
}

/** Enrichit les blocs marketing avec les Q/R du projet FAQ (à partir de `helpArticlePaths`). */
export async function enrichDocumentSectionsWithFaq<T extends {sections?: unknown[] | null}>(
  doc: T | null,
): Promise<T | null> {
  if (!doc?.sections?.length) return doc
  const sections = doc.sections as FaqSectionLike[]
  const paths = collectHelpArticlePaths(sections)
  if (!paths.length) return doc

  const bundles = await resolveHelpArticleFaqBundles(paths)
  const bundlesByPath = new Map<string, HelpArticleFaqBundle>()
  for (const bundle of bundles) {
    const path = helpArticlePathFromBundle(bundle)
    if (path) bundlesByPath.set(path, bundle)
  }

  return {
    ...doc,
    sections: sections.map((section) => assignFaqBundlesToSection(section, bundlesByPath)),
  }
}

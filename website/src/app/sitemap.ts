import type {MetadataRoute} from 'next'
import {faqSanityClient} from '@/lib/sanity-faq'
import {getMarketingPageSlugs} from '@/lib/sanity'
import {CMS_ISR_REVALIDATE_SEC, withDataCache} from '@/lib/sanity-cache'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.segnashare.com').replace(/\/+$/, '')

export const revalidate = 3600

type HelpCategoryNode = {
  category?: string
  sections?: string[]
  rootArticles?: string[]
  sectionArticles?: Array<{
    section?: string
    articles?: string[]
  }>
}

function asPath(path: string): string {
  if (!path.startsWith('/')) return `/${path}`
  return path
}

function toAbsoluteUrl(path: string): string {
  return new URL(asPath(path), SITE_URL).toString()
}

function compactSlug(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

const getHelpCenterPaths = withDataCache(async (): Promise<string[]> => {
  const categories = await faqSanityClient.fetch<HelpCategoryNode[]>(
    `*[_type == "helpCategory" && defined(slug.current)]{
      "category": slug.current,
      "sections": *[
        _type == "helpSection" &&
        category._ref == ^._id &&
        defined(slug.current)
      ].slug.current,
      "rootArticles": *[
        _type == "helpArticle" &&
        category._ref == ^._id &&
        !defined(section) &&
        defined(slug.current)
      ].slug.current,
      "sectionArticles": *[
        _type == "helpSection" &&
        category._ref == ^._id &&
        defined(slug.current)
      ]{
        "section": slug.current,
        "articles": *[
          _type == "helpArticle" &&
          section._ref == ^._id &&
          defined(slug.current)
        ].slug.current
      }
    }`,
  )

  const paths = new Set<string>(['/aide', '/aide/recherche'])

  for (const node of categories ?? []) {
    const category = compactSlug(node.category)
    if (!category) continue
    paths.add(`/aide/${category}`)

    for (const rootArticleSlug of node.rootArticles ?? []) {
      const article = compactSlug(rootArticleSlug)
      if (!article) continue
      paths.add(`/aide/${category}/${article}`)
    }

    for (const sectionSlug of node.sections ?? []) {
      const section = compactSlug(sectionSlug)
      if (!section) continue
      paths.add(`/aide/${category}/${section}`)
    }

    for (const sectionNode of node.sectionArticles ?? []) {
      const section = compactSlug(sectionNode.section)
      if (!section) continue
      for (const articleSlug of sectionNode.articles ?? []) {
        const article = compactSlug(articleSlug)
        if (!article) continue
        paths.add(`/aide/${category}/${section}/${article}`)
      }
    }
  }

  return [...paths]
}, ['help-center-sitemap-paths'], {revalidate: CMS_ISR_REVALIDATE_SEC})

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const [marketingSlugs, helpPaths] = await Promise.all([getMarketingPageSlugs(), getHelpCenterPaths()])

  const staticPaths = ['/', '/catalogue', '/newsroom']
  const marketingPaths = marketingSlugs
    .map((slug) => compactSlug(slug))
    .filter((slug): slug is string => Boolean(slug))
    .map((slug) => `/${slug}`)

  const allPaths = new Set<string>([...staticPaths, ...marketingPaths, ...helpPaths])

  return [...allPaths].map((path) => ({
    url: toAbsoluteUrl(path),
    lastModified: now,
    changeFrequency: 'weekly',
    priority: path === '/' ? 1 : 0.7,
  }))
}

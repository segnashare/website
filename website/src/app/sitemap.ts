import type {MetadataRoute} from 'next'
import {getMarketingPageSlugs} from '@/lib/sanity'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.segnashare.com').replace(/\/+$/, '')

export const revalidate = 3600

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const marketingSlugs = await getMarketingPageSlugs()
  const staticPaths = ['/', '/catalogue', '/newsroom', '/declaration-cookies']
  const marketingPaths = marketingSlugs
    .map((slug) => compactSlug(slug))
    .filter((slug): slug is string => Boolean(slug))
    .map((slug) => `/${slug}`)

  const allPaths = new Set<string>([...staticPaths, ...marketingPaths])

  return [...allPaths].map((path) => ({
    url: toAbsoluteUrl(path),
    lastModified: now,
    changeFrequency: 'weekly',
    priority: path === '/' ? 1 : 0.7,
  }))
}

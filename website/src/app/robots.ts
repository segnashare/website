import type {MetadataRoute} from 'next'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.segnashare.com').replace(/\/+$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/aide/recherche'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}

import {createClient} from '@sanity/client'

const projectId = process.env.NEXT_PUBLIC_SANITY_FAQ_PROJECT_ID ?? '87k2mn7n'
const dataset =
  process.env.NEXT_PUBLIC_SANITY_FAQ_DATASET ??
  process.env.NEXT_PUBLIC_SANITY_DATASET ??
  'production'
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01'

/** Client Sanity dédié au centre d'aide (projet séparé du website). */
export const faqSanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn:
    process.env.NODE_ENV === 'development'
      ? process.env.SANITY_USE_LIVE_API === 'false'
      : process.env.SANITY_USE_LIVE_API !== 'true',
})

export const FAQ_SANITY_PROJECT_ID = projectId
export const FAQ_SANITY_DATASET = dataset

import type {NextConfig} from 'next'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseHostname: string | undefined
try {
  if (supabaseUrl) supabaseHostname = new URL(supabaseUrl).hostname
} catch {
  supabaseHostname = undefined
}

// `||` : une env Vercel vide ("") ne doit pas produire un rewrite relatif `/flags`.
const posthogHost = (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com').replace(
  /\/+$/,
  '',
)
const posthogAssetsHost = posthogHost.includes('eu.i.')
  ? 'https://eu-assets.i.posthog.com'
  : 'https://us-assets.i.posthog.com'

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  async rewrites() {
    // beforeFiles: sinon `/ingest` est capturé par la page marketing `[slug]`.
    return {
      beforeFiles: [
        {
          source: '/ingest/static/:path*',
          destination: `${posthogAssetsHost}/static/:path*`,
        },
        {
          source: '/ingest/array/:path*',
          destination: `${posthogAssetsHost}/array/:path*`,
        },
        {
          source: '/ingest/:path*',
          destination: `${posthogHost}/:path*`,
        },
      ],
    }
  },
  async redirects() {
    return [
      {
        source: '/aide/:path*',
        destination: 'https://help.segnashare.com/:path*',
        permanent: true,
      },
      {
        // Landing marketing → /location ; garder /abonnement/recap et /abonnement/succes.
        source: '/abonnement',
        destination: '/location',
        permanent: true,
      },
      // Anciennes URLs catalogue (marque / catégorie). Ne pas matcher `piece`
      // (page détail `/catalogue/piece/:itemId` — gérée par l’App Router).
      {
        source: '/catalogue/:segment/categorie/:categorySlug',
        destination: '/catalogue?segment=:segment&categorie=:categorySlug',
        permanent: true,
      },
    ]
  },
  images: {
    /**
     * Next.js 16 n’autorise par défaut que `qualities: [75]`. Limiter les paliers réduit
     * les variantes Image Optimization (cache writes / transformations Vercel).
     */
    qualities: [75, 85, 90],
    minimumCacheTTL: 86400,
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      ...(supabaseHostname
        ? [
            {
              protocol: 'https' as const,
              hostname: supabaseHostname,
              pathname: '/storage/v1/object/sign/**',
            },
          ]
        : []),
    ],
  },
}

export default nextConfig

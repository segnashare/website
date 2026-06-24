import type {NextConfig} from 'next'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseHostname: string | undefined
try {
  if (supabaseUrl) supabaseHostname = new URL(supabaseUrl).hostname
} catch {
  supabaseHostname = undefined
}

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {source: '/catalogue/piece/:itemId', destination: '/catalogue', permanent: true},
      {
        source: '/catalogue/:segment/:categorySlug',
        destination: '/catalogue?segment=:segment&categorie=:categorySlug',
        permanent: true,
      },
      {source: '/catalogue/:segment', destination: '/catalogue?segment=:segment', permanent: true},
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

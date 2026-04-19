import type {NextConfig} from 'next'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseHostname: string | undefined
try {
  if (supabaseUrl) supabaseHostname = new URL(supabaseUrl).hostname
} catch {
  supabaseHostname = undefined
}

const nextConfig: NextConfig = {
  images: {
    /**
     * Next.js 16 n’autorise par défaut que `qualities: [75]`. Toute autre valeur
     * de `quality` sur `<Image>` est ramenée au plus proche (souvent 75), ce qui
     * dégrade fortement les visuels alors que le code demande 90–96.
     */
    qualities: [75, 80, 85, 90, 95, 96, 100],
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

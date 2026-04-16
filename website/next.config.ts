import type {NextConfig} from 'next'

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
    ],
  },
}

export default nextConfig

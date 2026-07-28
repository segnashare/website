import type {Metadata} from 'next'
import {Suspense} from 'react'
import {AuthPageClient} from '@/components/auth/AuthPageClient'
import {RecapWallImagePreloads} from '@/components/subscription/RecapWallImagePreloads'
import {WarmRecapWallImages} from '@/components/subscription/WarmRecapWallImages'

export const metadata: Metadata = {
  title: 'Créer un compte | Segna',
  description: 'Crée ton compte Segna pour activer SegnaX, louer et suivre tes commandes.',
}

export default function SignupPage() {
  return (
    <>
      <RecapWallImagePreloads />
      <WarmRecapWallImages />
      <Suspense fallback={<div style={{minHeight: '100dvh', background: '#fef8ef'}} />}>
        <AuthPageClient mode="signup" />
      </Suspense>
    </>
  )
}

import type {Metadata} from 'next'
import {Suspense} from 'react'
import {AuthPageClient} from '@/components/auth/AuthPageClient'

export const metadata: Metadata = {
  title: 'Créer un compte | Segna',
  description: 'Crée ton compte Segna pour activer SegnaX, louer et suivre tes commandes.',
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{minHeight: '100dvh', background: '#fef8ef'}} />}>
      <AuthPageClient mode="signup" />
    </Suspense>
  )
}

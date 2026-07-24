import type {Metadata} from 'next'
import {Suspense} from 'react'
import {AuthPageClient} from '@/components/auth/AuthPageClient'

export const metadata: Metadata = {
  title: 'Se connecter | Segna',
  description: 'Connecte-toi à ton compte Segna pour gérer ton abonnement et tes locations.',
}

export default function SigninPage() {
  return (
    <Suspense fallback={<div style={{minHeight: '100dvh', background: '#fef8ef'}} />}>
      <AuthPageClient mode="signin" />
    </Suspense>
  )
}

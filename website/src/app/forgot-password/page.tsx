import type {Metadata} from 'next'
import {Suspense} from 'react'
import {ForgotPasswordClient} from '@/components/auth/ForgotPasswordClient'
import {RecapWallImagePreloads} from '@/components/subscription/RecapWallImagePreloads'

export const metadata: Metadata = {
  title: 'Mot de passe oublié | Segna',
  description: 'Réinitialise le mot de passe de ton compte Segna.',
}

export default function ForgotPasswordPage() {
  return (
    <>
      <RecapWallImagePreloads />
      <Suspense fallback={<div style={{minHeight: '100dvh', background: '#fff'}} />}>
        <ForgotPasswordClient />
      </Suspense>
    </>
  )
}

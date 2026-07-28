import type {Metadata} from 'next'
import {ResetPasswordClient} from '@/components/auth/ResetPasswordClient'
import {RecapWallImagePreloads} from '@/components/subscription/RecapWallImagePreloads'

export const metadata: Metadata = {
  title: 'Nouveau mot de passe | Segna',
  description: 'Définis un nouveau mot de passe pour ton compte Segna.',
}

export default function ResetPasswordPage() {
  return (
    <>
      <RecapWallImagePreloads />
      <ResetPasswordClient />
    </>
  )
}

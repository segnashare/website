import type {Metadata} from 'next'
import {Suspense} from 'react'
import {SubscriptionSuccessClient} from '@/components/subscription/SubscriptionSuccessClient'
import {RECAP_WALL_ITEMS} from '@/lib/subscription/recap-wall-items'

export const metadata: Metadata = {
  title: 'Abonnement lancé | Segna',
  description:
    'Ton abonnement SegnaX est actif. Commence à emprunter et profite de tes avantages depuis l’app.',
}

export default function AbonnementSuccesPage() {
  return (
    <>
      {RECAP_WALL_ITEMS.slice(0, 12).map((item) => (
        <link key={item.id} rel="preload" as="image" href={item.coverUrl} />
      ))}
      <Suspense fallback={<div style={{minHeight: '60dvh', background: '#fff'}} />}>
        <SubscriptionSuccessClient wallItems={RECAP_WALL_ITEMS} />
      </Suspense>
    </>
  )
}

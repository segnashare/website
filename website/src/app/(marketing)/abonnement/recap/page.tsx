import type {Metadata} from 'next'
import {RecapWallImagePreloads} from '@/components/subscription/RecapWallImagePreloads'
import {SubscriptionRecapClient} from '@/components/subscription/SubscriptionRecapClient'
import {RECAP_WALL_ITEMS} from '@/lib/subscription/recap-wall-items'

export const metadata: Metadata = {
  title: 'Votre mois offert | Segna',
  description:
    'Activez votre abonnement Segna : le premier mois est offert, puis 39,99 €/mois. Annulation possible avant le renouvellement.',
}

export default function AbonnementRecapPage() {
  return (
    <>
      <RecapWallImagePreloads />
      <SubscriptionRecapClient wallItems={RECAP_WALL_ITEMS} />
    </>
  )
}

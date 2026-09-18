import type {Metadata} from 'next'
import {RecapWallImagePreloads} from '@/components/subscription/RecapWallImagePreloads'
import {SubscriptionRecapClient} from '@/components/subscription/SubscriptionRecapClient'
import {RECAP_WALL_ITEMS} from '@/lib/subscription/recap-wall-items'

export const metadata: Metadata = {
  title: 'Abonnement SegnaX | Segna',
  description:
    'Activez votre abonnement SegnaX : 40 €/mois, jusqu’à 400 € de pièces. Annulation possible avant le renouvellement.',
}

export default function AbonnementRecapPage() {
  return (
    <>
      <RecapWallImagePreloads />
      <SubscriptionRecapClient wallItems={RECAP_WALL_ITEMS} />
    </>
  )
}

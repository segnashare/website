import type {Metadata} from 'next'
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
      {RECAP_WALL_ITEMS.slice(0, 12).map((item) => (
        <link key={item.id} rel="preload" as="image" href={item.coverUrl} />
      ))}
      <SubscriptionRecapClient wallItems={RECAP_WALL_ITEMS} />
    </>
  )
}

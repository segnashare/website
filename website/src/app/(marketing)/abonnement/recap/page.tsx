import type {Metadata} from 'next'
import {SubscriptionRecapClient} from '@/components/subscription/SubscriptionRecapClient'
import {fetchRecapWallItems} from '@/lib/subscription/fetch-recap-wall-items'

export const metadata: Metadata = {
  title: 'Votre mois offert | Segna',
  description:
    'Activez votre abonnement Segna : le premier mois est offert, puis 39,99 €/mois. Annulation possible avant le renouvellement.',
}

export const revalidate = 3600

export default async function AbonnementRecapPage() {
  const wallItems = await fetchRecapWallItems(45)
  return <SubscriptionRecapClient wallItems={wallItems} />
}

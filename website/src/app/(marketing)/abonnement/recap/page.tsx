import type {Metadata} from 'next'
import {SubscriptionRecapClient} from '@/components/subscription/SubscriptionRecapClient'

export const metadata: Metadata = {
  title: 'Votre mois offert | Segna',
  description:
    'Activez votre abonnement Segna : le premier mois est offert, puis 39,99 €/mois. Annulation possible avant le renouvellement.',
}

export default function AbonnementRecapPage() {
  return <SubscriptionRecapClient />
}

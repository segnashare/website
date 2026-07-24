import type {Metadata} from 'next'
import {CartPageClient} from '@/components/cart/CartPageClient'

export const metadata: Metadata = {
  title: 'Panier | Segna',
  description: 'Ton panier Segna — abonnement SegnaX, location ponctuelle ou achat.',
}

export default function PanierPage() {
  return <CartPageClient />
}

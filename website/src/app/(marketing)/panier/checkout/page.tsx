import type {Metadata} from 'next'
import {PurchaseCheckoutClient} from '@/components/cart/PurchaseCheckoutClient'

export const metadata: Metadata = {
  title: 'Finaliser ma commande | Segna',
  description: 'Adresse de livraison et récapitulatif pour finaliser ton achat Segna.',
}

export default function CartCheckoutPage() {
  return <PurchaseCheckoutClient />
}

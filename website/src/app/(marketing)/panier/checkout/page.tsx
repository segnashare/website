import type {Metadata} from 'next'
import Link from 'next/link'
import {WEBSITE_CART_PATH, WEBSITE_SUBSCRIPTION_PATH} from '@/lib/cart/paths'

export const metadata: Metadata = {
  title: 'Checkout | Segna',
  description: 'Finalise ta commande Segna — création de compte, adresse et paiement Stripe.',
}

type Props = {
  searchParams: Promise<{mode?: string}>
}

export default async function CartCheckoutStubPage({searchParams}: Props) {
  const {mode} = await searchParams
  const isRental = mode === 'rental'
  const title = isRental ? 'Location ponctuelle' : 'Achat'

  return (
    <main
      style={{
        width: 'min(100%, 36rem)',
        margin: '0 auto',
        padding: 'clamp(1.5rem, 4vw, 2.75rem) 1.25rem 4.5rem',
      }}
    >
      <p style={{margin: '0 0 0.4rem', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#71717a'}}>
        Checkout
      </p>
      <h1 style={{margin: '0 0 0.75rem', fontSize: 'clamp(1.75rem, 4vw, 2.2rem)', fontWeight: 600, letterSpacing: '-0.02em'}}>
        {title}
      </h1>
      <p style={{margin: '0 0 1.5rem', color: '#52525b', lineHeight: 1.5}}>
        Prochaine étape&nbsp;: page facturation (compte, adresse de livraison) puis paiement Stripe. Le suivi se fera
        ensuite dans l&apos;app Segna.
      </p>
      <div style={{display: 'grid', gap: '0.65rem', maxWidth: '22rem'}}>
        <Link
          href={WEBSITE_SUBSCRIPTION_PATH}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '3rem',
            borderRadius: 999,
            background: '#14110f',
            color: '#fff',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Préférer SegnaX — 1er mois gratuit
        </Link>
        <Link href={WEBSITE_CART_PATH} style={{color: '#14110f', fontWeight: 600}}>
          ← Retour au panier
        </Link>
      </div>
    </main>
  )
}

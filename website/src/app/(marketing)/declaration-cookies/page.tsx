import type {Metadata} from 'next'
import Link from 'next/link'
import {CookieDeclaration} from '@/components/consent/CookieDeclaration'

export const metadata: Metadata = {
  title: 'Déclaration de cookies | Segna',
  description: 'Liste des cookies et technologies de suivi utilisés sur segnashare.com.',
}

export default function CookieDeclarationPage() {
  return (
    <main>
      <div className="container" style={{paddingBlock: '2rem 4rem', maxWidth: '48rem'}}>
        <Link href="/">← Retour à l’accueil</Link>
        <h1 style={{marginTop: '2rem', marginBottom: '1.5rem'}}>Déclaration de cookies</h1>
        <CookieDeclaration />
      </div>
    </main>
  )
}

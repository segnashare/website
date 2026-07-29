import {redirect} from 'next/navigation'

type PageProps = {
  params: Promise<{cartId: string}>
}

/** Ancienne page détail : le détail s’ouvre en accordéon sur `/profil/commandes`. */
export default async function ProfilCommandeDetailRedirect({params}: PageProps) {
  await params
  redirect('/profil/commandes')
}

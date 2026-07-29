'use client'

import Link from 'next/link'
import {WEBSITE_CART_PATH} from '@/lib/cart/paths'
import {useWebsiteCart} from '@/lib/cart/use-website-cart'
import styles from './cartNavLink.module.css'

type Props = {
  className?: string
  /** Icône claire (hero transparent) ou foncée (nav scrolled / fond clair). */
  tone?: 'auto' | 'light' | 'dark'
}

export function CartNavLink({className, tone = 'auto'}: Props) {
  const {count} = useWebsiteCart()
  if (count <= 0) return null

  const label = `Panier, ${count} article${count > 1 ? 's' : ''}`

  return (
    <Link
      href={WEBSITE_CART_PATH}
      className={[styles.link, tone === 'light' ? styles.toneLight : '', tone === 'dark' ? styles.toneDark : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-label={label}
    >
      <span className={styles.icon} aria-hidden />
      <span className={styles.badge} aria-hidden>
        {count > 99 ? '99+' : count}
      </span>
    </Link>
  )
}

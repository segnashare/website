import Link from 'next/link'
import styles from './help.module.css'
import type {HelpCenterSettingsData} from '@/lib/sanity-help'

type HelpFooterCtaProps = {
  settings: HelpCenterSettingsData | null
}

export function HelpFooterCta({settings}: HelpFooterCtaProps) {
  const question = settings?.footerCtaQuestion ?? 'Une autre question ?'
  const label = settings?.footerCtaLinkLabel ?? 'Nous contacter'
  const href = settings?.footerCtaHref ?? '#'
  const homeHref = settings?.homeLinkHref ?? '/'

  return (
    <footer className={styles.footerCta}>
      <div className={styles.footerInner}>
        <div className={styles.footerBack}>
          <Link href={homeHref}>← Retour au site</Link>
        </div>
        <div className={styles.footerCenter}>
          <p>{question}</p>
          <a href={href}>{label}</a>
        </div>
        <div className={styles.footerRightSpacer} aria-hidden />
      </div>
    </footer>
  )
}

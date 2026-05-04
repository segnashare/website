import type {Metadata} from 'next'
import type {CSSProperties} from 'react'
import {HelpHeader} from '@/components/help/HelpHeader'
import {SiteFooter} from '@/components/layout/SiteFooter'
import styles from '@/components/help/help.module.css'
import {getWebsiteFooter} from '@/lib/sanity'
import {getHelpCenterSettings} from '@/lib/sanity-help'

export const metadata: Metadata = {
  title: 'Centre d’aide | Segna',
  description: 'Questions fréquentes et aide Segna.',
}

function resolveAccent(hex: string | undefined): string {
  if (hex && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) return hex
  return '#4a2c5a'
}

export default async function AideLayout({children}: Readonly<{children: React.ReactNode}>) {
  const [settings, footer] = await Promise.all([getHelpCenterSettings(), getWebsiteFooter()])
  const accent = resolveAccent(settings?.accentHex)

  const shellStyle: CSSProperties & {'--help-accent'?: string} = {'--help-accent': accent}

  return (
    <div className={styles.shell} style={shellStyle}>
      <HelpHeader settings={settings} />
      {children}
      <SiteFooter data={footer} />
    </div>
  )
}

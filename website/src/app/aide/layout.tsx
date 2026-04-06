import type {Metadata} from 'next'
import type {CSSProperties} from 'react'
import {HelpFooterCta} from '@/components/help/HelpFooterCta'
import {HelpHeader} from '@/components/help/HelpHeader'
import styles from '@/components/help/help.module.css'
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
  const settings = await getHelpCenterSettings()
  const accent = resolveAccent(settings?.accentHex)

  const shellStyle: CSSProperties & {'--help-accent'?: string} = {'--help-accent': accent}

  return (
    <div className={styles.shell} style={shellStyle}>
      <HelpHeader settings={settings} />
      {children}
      <HelpFooterCta settings={settings} />
    </div>
  )
}

import {SiteFooter} from '@/components/layout/SiteFooter'
import {getWebsiteFooter} from '@/lib/sanity'

export default async function MarketingLayout({children}: Readonly<{children: React.ReactNode}>) {
  const footer = await getWebsiteFooter()

  return (
    <>
      {children}
      <SiteFooter data={footer} />
    </>
  )
}

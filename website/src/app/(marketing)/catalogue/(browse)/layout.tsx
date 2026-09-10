import {SiteNavChrome} from '@/components/home/SiteNavChrome'
import {PageSections} from '@/components/cms/PageSections'
import {getCatalogueMarketingShell} from '@/lib/catalog/catalogue-marketing-shell'
import styles from './catalogueBrowseLayout.module.css'

export const revalidate = 86400

export default async function CatalogueBrowseLayout({children}: {children: React.ReactNode}) {
  const {headerNav, sections} = await getCatalogueMarketingShell()

  return (
    <div className={styles.root}>
      <SiteNavChrome header={headerNav} mobileNavId="mobile-nav-catalogue" surface="light" />
      <main className={styles.main}>
        {children}
        {sections.length > 0 ? (
          <div className="container" style={{paddingBlock: '0 2rem'}}>
            <PageSections sections={sections} />
          </div>
        ) : null}
      </main>
    </div>
  )
}

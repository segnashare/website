import styles from '@/components/page-sections/websiteCatalogBrowse.module.css'

function CatalogPhotoSkeleton() {
  return <div className={styles.catalogLoadingPhoto} aria-hidden />
}

export default function CatalogueBrowseLoading() {
  return (
    <div className={styles.catalogBrowseLoadingRoot} aria-busy aria-label="Chargement du catalogue">
      <div className={styles.catalogLoadingToolbar}>
        <div className={styles.catalogLoadingChip} />
        <div className={styles.catalogLoadingChip} />
        <div className={styles.catalogLoadingChipWide} />
      </div>
      <div className={styles.catalogLoadingGrid}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={styles.catalogLoadingCard}>
            <CatalogPhotoSkeleton />
            <div className={styles.catalogLoadingMeta}>
              <div className={styles.catalogLoadingLine} />
              <div className={styles.catalogLoadingLineShort} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

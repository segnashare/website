import {CatalogRingDotSpinner} from '@/components/catalog/CatalogRingDotSpinner'
import styles from './piecePage.module.css'

export default function CataloguePieceLoading() {
  return (
    <div className={styles.routeLoading} role="status" aria-live="polite">
      <CatalogRingDotSpinner aria-label="Chargement de la pièce" />
    </div>
  )
}

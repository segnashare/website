import styles from './newsroomLayout.module.css'

export const revalidate = 3600

/** Conteneur partagé liste + articles. */
export default function NewsroomRootLayout({children}: {children: React.ReactNode}) {
  return <div className={styles.root}>{children}</div>
}

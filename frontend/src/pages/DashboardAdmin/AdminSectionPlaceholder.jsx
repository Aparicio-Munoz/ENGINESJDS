import styles from './AdminSectionPlaceholder.module.css'

export function AdminSectionPlaceholder({ title }) {
  return (
    <section className={styles.page}>
      <p className={styles.eyebrow}>Módulo administrativo</p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>
        Vista base preparada para conectar datos y flujos cuando exista backend.
      </p>
    </section>
  )
}

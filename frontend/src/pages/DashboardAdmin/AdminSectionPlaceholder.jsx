import styles from './DashboardAdmin.module.css'

export function AdminSectionPlaceholder({ title }) {
  return (
    <section className={styles.dashboardPage}>
      <div className={styles.pageHeader}>
        <p className={styles.eyebrow}>Modulo administrativo</p>
        <h1>{title}</h1>
        <p>Vista base preparada para conectar datos y flujos cuando exista backend.</p>
      </div>
    </section>
  )
}

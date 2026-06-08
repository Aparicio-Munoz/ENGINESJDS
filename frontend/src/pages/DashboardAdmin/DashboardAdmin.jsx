import { useAuth } from '../../hooks/useAuth'
import styles from './DashboardAdmin.module.css'

const stats = [
  { label: 'Usuarios', value: '24', detail: 'Cuentas registradas' },
  { label: 'Motocicletas', value: '118', detail: 'Vehiculos en historial' },
  { label: 'Ordenes activas', value: '9', detail: 'Trabajos en proceso' },
  { label: 'Repuestos', value: '342', detail: 'Unidades disponibles' },
]

export function DashboardAdmin() {
  const { user } = useAuth()

  return (
    <section className={styles.dashboardPage}>
      <div className={styles.pageHeader}>
        <p className={styles.eyebrow}>Panel administrativo</p>
        <h1>Dashboard</h1>
        <p>
          Bienvenido, {user?.name || 'administrador'}. Desde aqui se gestionara la
          operacion principal de ENGINES JDS.
        </p>
      </div>

      <div className={styles.statsGrid} aria-label="Estadisticas principales">
        {stats.map((stat) => (
          <article className={styles.statCard} key={stat.label}>
            <p className={styles.statLabel}>{stat.label}</p>
            <strong className={styles.statValue}>{stat.value}</strong>
            <p className={styles.statDetail}>{stat.detail}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

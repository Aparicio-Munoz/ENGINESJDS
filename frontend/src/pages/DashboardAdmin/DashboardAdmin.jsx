import { useMemo } from 'react'
import { getClients } from '../../services/clientsService'
import { getEmployees } from '../../services/employeesService'
import { getInventory } from '../../services/inventoryService'
import { getMotorcycles } from '../../services/motorcyclesService'
import { getOrders } from '../../services/ordersService'
import { getUsers } from '../../services/usersService'
import { useAuth } from '../../hooks/useAuth'
import styles from './DashboardAdmin.module.css'

const ORDER_STATUSES = [
  { key: 'Recibida',           color: '#1d4ed8', bg: '#dbeafe' },
  { key: 'Diagnóstico',        color: '#92400e', bg: '#fef3c7' },
  { key: 'En reparación',      color: '#9a3412', bg: '#ffedd5' },
  { key: 'Lista para entrega', color: '#6d28d9', bg: '#ede9fe' },
  { key: 'Entregada',          color: '#047857', bg: '#d1fae5' },
]

const INVENTORY_STATUSES = [
  { key: 'Disponible', color: '#047857', bg: '#d1fae5' },
  { key: 'Stock bajo', color: '#92400e', bg: '#fef3c7' },
  { key: 'Agotado',    color: '#b42318', bg: '#fee4e2' },
]

export function DashboardAdmin() {
  const { user } = useAuth()

  const clients    = useMemo(() => getClients([]),    [])
  const motorcycles = useMemo(() => getMotorcycles([]), [])
  const orders     = useMemo(() => getOrders([]),     [])
  const inventory  = useMemo(() => getInventory([]),  [])
  const employees  = useMemo(() => getEmployees([]),  [])
  const users      = useMemo(() => getUsers([]),      [])

  const kpis = [
    { label: 'Clientes',      value: clients.length,     detail: 'Clientes registrados' },
    { label: 'Motocicletas',  value: motorcycles.length, detail: 'Vehiculos en historial' },
    { label: 'Órdenes',       value: orders.length,      detail: 'Ordenes de trabajo' },
    { label: 'Inventario',    value: inventory.length,   detail: 'Repuestos registrados' },
    { label: 'Empleados',     value: employees.length,   detail: 'Empleados registrados' },
    { label: 'Usuarios',      value: users.length,       detail: 'Cuentas del sistema' },
  ]

  const orderCounts = useMemo(
    () => ORDER_STATUSES.map((s) => ({
      ...s,
      count: orders.filter((o) => o.status === s.key).length,
    })),
    [orders],
  )

  const inventoryCounts = useMemo(
    () => INVENTORY_STATUSES.map((s) => ({
      ...s,
      count: inventory.filter((i) => i.status === s.key).length,
    })),
    [inventory],
  )

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
        {kpis.map((kpi) => (
          <article className={styles.statCard} key={kpi.label}>
            <p className={styles.statLabel}>{kpi.label}</p>
            <strong className={styles.statValue}>{kpi.value}</strong>
            <p className={styles.statDetail}>{kpi.detail}</p>
          </article>
        ))}
      </div>

      <div className={styles.breakdownRow}>
        <div className={styles.breakdownBlock}>
          <p className={styles.sectionTitle}>Órdenes por estado</p>
          <div className={styles.breakdownList}>
            {orderCounts.map((s) => (
              <div className={styles.breakdownItem} key={s.key}>
                <span className={styles.dot} style={{ background: s.bg, color: s.color }} />
                <span className={styles.breakdownLabel}>{s.key}</span>
                <span className={styles.breakdownCount}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.breakdownBlock}>
          <p className={styles.sectionTitle}>Inventario por estado</p>
          <div className={styles.breakdownList}>
            {inventoryCounts.map((s) => (
              <div className={styles.breakdownItem} key={s.key}>
                <span className={styles.dot} style={{ background: s.bg, color: s.color }} />
                <span className={styles.breakdownLabel}>{s.key}</span>
                <span className={styles.breakdownCount}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

import { useMemo } from 'react'
import { getClients } from '../../../services/clientsService'
import { getEmployees } from '../../../services/employeesService'
import { getInventory } from '../../../services/inventoryService'
import { getMotorcycles } from '../../../services/motorcyclesService'
import { getOrders } from '../../../services/ordersService'
import { getUsers } from '../../../services/usersService'
import styles from './Reportes.module.css'

const ORDER_STATUSES = [
  { key: 'Recibida', color: '#1d4ed8', bg: '#dbeafe' },
  { key: 'Diagnóstico', color: '#92400e', bg: '#fef3c7' },
  { key: 'En reparación', color: '#9a3412', bg: '#ffedd5' },
  { key: 'Lista para entrega', color: '#6d28d9', bg: '#ede9fe' },
  { key: 'Entregada', color: '#047857', bg: '#d1fae5' },
]

const INVENTORY_STATUSES = [
  { key: 'Disponible', color: '#047857', bg: '#d1fae5' },
  { key: 'Stock bajo', color: '#92400e', bg: '#fef3c7' },
  { key: 'Agotado', color: '#b42318', bg: '#fee4e2' },
]

export function Reportes() {
  const clients = useMemo(() => getClients([]), [])
  const motorcycles = useMemo(() => getMotorcycles([]), [])
  const orders = useMemo(() => getOrders([]), [])
  const inventory = useMemo(() => getInventory([]), [])
  const employees = useMemo(() => getEmployees([]), [])
  const users = useMemo(() => getUsers([]), [])

  const kpis = [
    { label: 'Clientes', value: clients.length, detail: 'Clientes registrados' },
    { label: 'Motocicletas', value: motorcycles.length, detail: 'Vehiculos en historial' },
    { label: 'Órdenes', value: orders.length, detail: 'Ordenes de trabajo' },
    { label: 'Inventario', value: inventory.length, detail: 'Repuestos registrados' },
    { label: 'Empleados', value: employees.length, detail: 'Empleados activos y registrados' },
    { label: 'Usuarios', value: users.length, detail: 'Cuentas del sistema' },
  ]

  const orderCounts = useMemo(
    () =>
      ORDER_STATUSES.map((s) => ({
        ...s,
        count: orders.filter((o) => o.status === s.key).length,
      })),
    [orders],
  )

  const inventoryCounts = useMemo(
    () =>
      INVENTORY_STATUSES.map((s) => ({
        ...s,
        count: inventory.filter((i) => i.status === s.key).length,
      })),
    [inventory],
  )

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <p className={styles.eyebrow}>Modulo administrativo</p>
        <h1>Reportes</h1>
        <p>Vista consolidada de los datos del sistema leidos desde almacenamiento local.</p>
      </div>

      <div className={styles.block}>
        <h2 className={styles.blockTitle}>Resumen general</h2>
        <div className={styles.kpiGrid}>
          {kpis.map((kpi) => (
            <article className={styles.kpiCard} key={kpi.label}>
              <p className={styles.kpiLabel}>{kpi.label}</p>
              <strong className={styles.kpiValue}>{kpi.value}</strong>
              <p className={styles.kpiDetail}>{kpi.detail}</p>
            </article>
          ))}
        </div>
      </div>

      <div className={styles.breakdownRow}>
        <div className={styles.block}>
          <h2 className={styles.blockTitle}>Órdenes por estado</h2>
          <div className={styles.breakdownList}>
            {orderCounts.map((s) => (
              <div className={styles.breakdownItem} key={s.key}>
                <span
                  className={styles.dot}
                  style={{ background: s.bg, color: s.color }}
                />
                <span className={styles.breakdownLabel}>{s.key}</span>
                <span className={styles.breakdownCount}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.block}>
          <h2 className={styles.blockTitle}>Inventario por estado</h2>
          <div className={styles.breakdownList}>
            {inventoryCounts.map((s) => (
              <div className={styles.breakdownItem} key={s.key}>
                <span
                  className={styles.dot}
                  style={{ background: s.bg, color: s.color }}
                />
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

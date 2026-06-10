import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getClients } from '../../services/clientsService'
import { getEmployees } from '../../services/employeesService'
import { getInventory } from '../../services/inventoryService'
import { getMotorcycles } from '../../services/motorcyclesService'
import { getOrders } from '../../services/ordersService'
import { getUsers } from '../../services/usersService'
import { getAppointments } from '../../services/appointmentsService'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../utils/routes'
import styles from './DashboardAdmin.module.css'

const ORDER_STATUSES = [
  { key: 'Recibida',           color: '#2563EB', bg: '#DBEAFE' },
  { key: 'Diagnóstico',        color: '#D97706', bg: '#FEF3C7' },
  { key: 'En reparación',      color: '#EA580C', bg: '#FFEDD5' },
  { key: 'Lista para entrega', color: '#7C3AED', bg: '#EDE9FE' },
  { key: 'Entregada',          color: '#059669', bg: '#D1FAE5' },
]

const KPI_CONFIG = [
  { label: 'Clientes',     detail: 'registrados',           icon: '👥', accent: '#2563EB',  link: ROUTES.adminClientes },
  { label: 'Motocicletas', detail: 'en historial',          icon: '🏍️', accent: '#F97316',  link: `${ROUTES.admin}/motocicletas` },
  { label: 'Órdenes',      detail: 'de trabajo totales',    icon: '📋', accent: '#7C3AED',  link: ROUTES.adminOrdenes },
  { label: 'Inventario',   detail: 'ítems registrados',     icon: '📦', accent: '#059669',  link: ROUTES.adminInventario },
  { label: 'Empleados',    detail: 'del taller',            icon: '🔧', accent: '#0891B2',  link: ROUTES.adminEmpleados },
  { label: 'Usuarios',     detail: 'del sistema',           icon: '🔑', accent: '#64748B',  link: `${ROUTES.admin}/usuarios` },
  { label: 'Citas',        detail: 'agendadas',             icon: '📅', accent: '#D97706',  link: ROUTES.adminCitas },
]

const APPT_STATUS_STYLES = {
  Pendiente:  { bg: '#FEF3C7', color: '#D97706' },
  Confirmada: { bg: '#DBEAFE', color: '#2563EB' },
  Atendida:   { bg: '#D1FAE5', color: '#059669' },
  Cancelada:  { bg: '#FEE2E2', color: '#DC2626' },
}

export function DashboardAdmin() {
  const { user } = useAuth()

  const clients     = useMemo(() => getClients([]),      [])
  const motorcycles = useMemo(() => getMotorcycles([]),  [])
  const orders      = useMemo(() => getOrders([]),       [])
  const inventory   = useMemo(() => getInventory([]),    [])
  const employees   = useMemo(() => getEmployees([]),    [])
  const users       = useMemo(() => getUsers([]),        [])
  const appointments = useMemo(() => getAppointments([]), [])

  const counts = [clients.length, motorcycles.length, orders.length, inventory.length, employees.length, users.length, appointments.length]

  const pendingAppointments = useMemo(
    () => appointments.filter((a) => a.status === 'Pendiente' || a.status === 'Confirmada'),
    [appointments],
  )

  const recentAppointments = useMemo(
    () => [...appointments].reverse().slice(0, 5),
    [appointments],
  )

  const orderCounts = useMemo(
    () => ORDER_STATUSES.map((s) => ({
      ...s,
      count: orders.filter((o) => o.status === s.key).length,
    })),
    [orders],
  )

  const lowStockItems = useMemo(
    () => inventory.filter((i) => i.status === 'Stock bajo' || i.status === 'Agotado').slice(0, 5),
    [inventory],
  )

  const recentOrders = useMemo(() => [...orders].reverse().slice(0, 5), [orders])

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <section className={styles.page}>
      {/* Page header */}
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Panel administrativo</p>
          <h1 className={styles.title}>
            {greeting}, <span className={styles.titleAccent}>{user?.name?.split(' ')[0] || 'admin'}</span>
          </h1>
          <p className={styles.subtitle}>
            Aquí tienes un resumen del estado actual de ENGINES JDS.
          </p>
        </div>
        <Link to={ROUTES.adminOrdenes} className={styles.newOrderBtn}>
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Nueva orden
        </Link>
      </div>

      {/* KPI grid */}
      <div className={styles.kpiGrid} aria-label="Estadísticas principales">
        {KPI_CONFIG.map((kpi, i) => (
          <Link key={kpi.label} to={kpi.link} className={styles.kpiCard} style={{ '--kpi-accent': kpi.accent }}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiIcon} aria-hidden="true">{kpi.icon}</span>
              <span className={styles.kpiLabel}>{kpi.label}</span>
            </div>
            <strong className={styles.kpiValue}>{counts[i]}</strong>
            <span className={styles.kpiDetail}>{counts[i] === 1 ? '1' : counts[i]} {kpi.detail}</span>
          </Link>
        ))}
      </div>

      {/* Bottom row */}
      <div className={styles.bottomRow}>
        {/* Orders by status */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path fillRule="evenodd" d="M4 4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-5L9 4H4Z" clipRule="evenodd" />
            </svg>
            Órdenes por estado
          </h2>
          <div className={styles.statusList}>
            {orderCounts.map((s) => (
              <div className={styles.statusItem} key={s.key}>
                <span className={styles.statusDot} style={{ background: s.bg, color: s.color }} />
                <span className={styles.statusLabel}>{s.key}</span>
                <span className={styles.statusCount}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent orders */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
            </svg>
            Últimas órdenes
          </h2>
          {recentOrders.length === 0 ? (
            <p className={styles.emptyHint}>No hay órdenes registradas aún.</p>
          ) : (
            <div className={styles.orderList}>
              {recentOrders.map((o) => (
                <div key={o.id} className={styles.orderItem}>
                  <div>
                    <span className={styles.orderNumber}>{o.orderNumber}</span>
                    <span className={styles.orderClient}>{o.clientName}</span>
                  </div>
                  <span
                    className={styles.orderBadge}
                    style={{
                      background: ORDER_STATUSES.find((s) => s.key === o.status)?.bg ?? '#F1F5F9',
                      color: ORDER_STATUSES.find((s) => s.key === o.status)?.color ?? '#64748B',
                    }}
                  >
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming appointments */}
        <div className={styles.panel}>
          <div className={styles.panelTitleRow}>
            <h2 className={styles.panelTitle}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
              </svg>
              Últimas citas
            </h2>
            {pendingAppointments.length > 0 ? (
              <span className={styles.pendingBadge}>{pendingAppointments.length} pendiente{pendingAppointments.length > 1 ? 's' : ''}</span>
            ) : null}
          </div>
          {recentAppointments.length === 0 ? (
            <p className={styles.emptyHint}>No hay citas registradas aún.</p>
          ) : (
            <div className={styles.orderList}>
              {recentAppointments.map((a) => (
                <div key={a.id} className={styles.orderItem}>
                  <div>
                    <span className={styles.orderNumber}>{a.name}</span>
                    <span className={styles.orderClient}>{a.service || a.date || '—'}</span>
                  </div>
                  <span
                    className={styles.orderBadge}
                    style={{
                      background: (APPT_STATUS_STYLES[a.status] ?? {}).bg ?? '#F1F5F9',
                      color: (APPT_STATUS_STYLES[a.status] ?? {}).color ?? '#64748B',
                    }}
                  >
                    {a.status || 'Pendiente'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inventory alerts */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            Alertas de inventario
          </h2>
          {lowStockItems.length === 0 ? (
            <p className={styles.emptyHint}>
              {inventory.length === 0 ? 'Sin repuestos registrados.' : '✓ Todo el inventario está disponible.'}
            </p>
          ) : (
            <div className={styles.alertList}>
              {lowStockItems.map((item) => (
                <div key={item.id} className={styles.alertItem}>
                  <div>
                    <span className={styles.alertCode}>{item.code}</span>
                    <span className={styles.alertName}>{item.name}</span>
                  </div>
                  <span
                    className={styles.alertBadge}
                    style={{
                      background: item.status === 'Agotado' ? '#FEE2E2' : '#FEF3C7',
                      color:      item.status === 'Agotado' ? '#DC2626' : '#D97706',
                    }}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { reportsApi } from '../../api/reportsApi'
import { ordersApi } from '../../api/ordersApi'
import { appointmentsApi } from '../../api/appointmentsApi'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../utils/routes'
import styles from './DashboardAdmin.module.css'

// ── Constantes ─────────────────────────────────────────────────
const ORDER_STATUS_MAP = {
  Pendiente:            { color: '#2563EB', bg: '#DBEAFE' },
  'En proceso':         { color: '#EA580C', bg: '#FFEDD5' },
  'En reparación':      { color: '#EA580C', bg: '#FFEDD5' },
  'Esperando repuesto': { color: '#92400E', bg: '#FEF3C7' },
  Listo:                { color: '#7C3AED', bg: '#EDE9FE' },
  'Lista para entrega': { color: '#7C3AED', bg: '#EDE9FE' },
  Entregada:            { color: '#059669', bg: '#D1FAE5' },
}

const QUICK_LINKS = [
  { label: 'Clientes',     to: ROUTES.adminClientes,        icon: '👥' },
  { label: 'Motocicletas', to: `${ROUTES.admin}/motocicletas`, icon: '🏍️' },
  { label: 'Órdenes',      to: ROUTES.adminOrdenes,         icon: '📋' },
  { label: 'Inventario',   to: ROUTES.adminInventario,      icon: '📦' },
  { label: 'Empleados',    to: ROUTES.adminEmpleados,       icon: '🔧' },
  { label: 'Citas',        to: ROUTES.adminCitas,           icon: '📅' },
  { label: 'Reportes',     to: ROUTES.adminReportes,        icon: '📊' },
]

// ── Subcomponents ──────────────────────────────────────────────
function ActivityIcon({ type }) {
  const icons = {
    order:       { bg: '#DBEAFE', color: '#2563EB', path: 'M4 4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-5L9 4H4Z' },
    delivered:   { bg: '#D1FAE5', color: '#059669', path: 'M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z' },
    appointment: { bg: '#FEF3C7', color: '#D97706', path: 'M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Z' },
  }
  const cfg = icons[type] ?? icons.order
  return (
    <div className={styles.actIcon} style={{ background: cfg.bg, color: cfg.color }}>
      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
        <path fillRule="evenodd" d={cfg.path} clipRule="evenodd" />
      </svg>
    </div>
  )
}

function KpiSkeleton() {
  return (
    <div className={styles.kpiGrid} aria-hidden="true">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className={styles.kpiCard} style={{ opacity: 0.4, pointerEvents: 'none' }}>
          <div className={styles.kpiTop}>
            <div className={styles.kpiIconWrap} style={{ background: '#F1F5F9' }} />
          </div>
          <strong className={styles.kpiValue} style={{ background: '#F1F5F9', borderRadius: 4, color: 'transparent', minWidth: 40, display: 'inline-block' }}>—</strong>
          <span className={styles.kpiLabel} style={{ background: '#F1F5F9', borderRadius: 4, color: 'transparent' }}>———————</span>
        </div>
      ))}
    </div>
  )
}

// ── Estado inicial ─────────────────────────────────────────────
const INITIAL_STATE = {
  loading: true,
  refreshing: false,
  error: null,
  summary: null,
  activeOrders: [],
  pendingAppointments: [],
  inventoryAlerts: null,
}

// ── Componente principal ───────────────────────────────────────
export function DashboardAdmin() {
  const { user } = useAuth()
  const [state, setState] = useState(INITIAL_STATE)
  const mountedRef = useRef(true)

  const {
    loading, refreshing, error,
    summary, activeOrders, pendingAppointments, inventoryAlerts,
  } = state

  // ── Carga de datos ──────────────────────────────────────────
  const loadData = useCallback(async (isRefresh = false) => {
    setState((prev) => ({
      ...prev,
      loading: !isRefresh,
      refreshing: isRefresh,
      error: null,
    }))

    try {
      const [summaryData, activeOrdersData, apptsRes, alertsData] = await Promise.all([
        reportsApi.getSummary(),
        ordersApi.getActive(),
        appointmentsApi.getAll({ status: 'Pendiente', limit: 10 }),
        reportsApi.getInventoryAlerts(),
      ])

      if (!mountedRef.current) return

      setState({
        loading: false,
        refreshing: false,
        error: null,
        summary: summaryData,
        activeOrders: activeOrdersData ?? [],
        pendingAppointments: apptsRes?.data ?? [],
        inventoryAlerts: alertsData,
      })
    } catch (err) {
      if (!mountedRef.current) return
      setState((prev) => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: err.message || 'Error al cargar los datos del panel.',
      }))
    }
  }, [])

  // Carga inicial + refresco cada 60 s
  useEffect(() => {
    mountedRef.current = true
    loadData()
    const interval = setInterval(() => loadData(true), 60_000)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [loadData])

  // ── Datos derivados ─────────────────────────────────────────
  const now     = new Date()
  const hour    = now.getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  const activityFeed = useMemo(() => {
    const events = []

    activeOrders.slice(0, 6).forEach((o) => {
      const clientFullName = [o.client_name, o.client_last_name].filter(Boolean).join(' ')
      events.push({
        id:    `ord-${o.id}`,
        type:  'order',
        title: `Orden activa — ${o.order_number}`,
        sub:   clientFullName || '—',
        date:  o.entry_date
          ? new Date(o.entry_date).toLocaleDateString('es-CO')
          : 'Hoy',
      })
    })

    pendingAppointments.slice(0, 4).forEach((a) => {
      events.push({
        id:    `apt-${a.id}`,
        type:  'appointment',
        title: `Cita — ${a.service_type || 'Servicio'}`,
        sub:   a.client_name || '—',
        date:  a.requested_date
          ? new Date(a.requested_date).toLocaleDateString('es-CO')
          : 'Sin fecha',
      })
    })

    return events.slice(0, 10)
  }, [activeOrders, pendingAppointments])

  const lowStockItems = inventoryAlerts?.items?.slice(0, 3) ?? []
  const listoOrders   = activeOrders.filter((o) => o.status === 'Listo' || o.status === 'Lista para entrega').slice(0, 2)
  const totalAlerts   = lowStockItems.length + listoOrders.length + Math.min(pendingAppointments.length, 2)

  const ordersByStatus = useMemo(() => {
    const counts = {
      Pendiente: 0, 'En proceso': 0, 'En reparación': 0,
      'Esperando repuesto': 0, Listo: 0, 'Lista para entrega': 0,
    }
    activeOrders.forEach((o) => {
      if (o.status in counts) counts[o.status]++
    })
    return Object.entries(ORDER_STATUS_MAP).map(([key, style]) => ({
      key,
      ...style,
      count: key === 'Entregada'
        ? (summary?.completedToday ?? 0)
        : (counts[key] ?? 0),
    }))
  }, [activeOrders, summary])

  const kpi = {
    activeOrders:     summary?.activeOrders          ?? 0,
    appointmentsToday: summary?.appointmentsToday    ?? 0,
    completedToday:   summary?.completedToday        ?? 0,
    motorcyclesInService: summary?.motorcyclesInService ?? 0,
  }

  // ── Pantalla de error ───────────────────────────────────────
  if (error && !loading) {
    return (
      <section className={styles.page}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Panel administrativo</p>
            <h1 className={styles.title}>Dashboard</h1>
          </div>
        </div>
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <svg viewBox="0 0 20 20" fill="#DC2626" width="40" height="40" aria-hidden="true" style={{ marginBottom: '1rem' }}>
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-.75-4.75a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-1.5 0v4.5Zm.75 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <p style={{ color: '#DC2626', marginBottom: '1rem', fontWeight: 500 }}>{error}</p>
          <button
            type="button"
            onClick={() => loadData()}
            style={{ padding: '0.5rem 1.5rem', cursor: 'pointer', borderRadius: '8px', border: '1.5px solid #DC2626', color: '#DC2626', background: 'transparent', fontWeight: 500 }}
          >
            Reintentar
          </button>
        </div>
      </section>
    )
  }

  // ── Render principal ────────────────────────────────────────
  return (
    <section className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            Panel administrativo · {now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
            {refreshing ? (
              <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: '#94A3B8', fontWeight: 400 }}>
                Actualizando…
              </span>
            ) : null}
          </p>
          <h1 className={styles.title}>
            {greeting},{' '}
            <span className={styles.titleAccent}>
              {user?.username || user?.name?.split(' ')[0] || 'Admin'}
            </span>
          </h1>
          <p className={styles.subtitle}>Estado operativo actual del taller.</p>
        </div>
        <Link to={ROUTES.adminOrdenes} className={styles.newOrderBtn}>
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Nueva orden
        </Link>
      </div>

      {/* KPI Grid — skeleton durante carga inicial */}
      {loading ? <KpiSkeleton /> : (
        <div className={styles.kpiGrid} aria-label="Estado operativo">

          <div className={styles.kpiCard} style={{ '--kpi-accent': '#EA580C' }}>
            <div className={styles.kpiTop}>
              <div className={styles.kpiIconWrap} style={{ background: '#FFEDD5', color: '#EA580C' }}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
                  <path fillRule="evenodd" d="M4 4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-5L9 4H4Z" clipRule="evenodd" />
                </svg>
              </div>
              <span className={styles.kpiTrend} data-active={kpi.activeOrders > 0}>
                {kpi.activeOrders > 0 ? 'En proceso' : 'Sin pendientes'}
              </span>
            </div>
            <strong className={styles.kpiValue}>{kpi.activeOrders}</strong>
            <span className={styles.kpiLabel}>Órdenes activas</span>
          </div>

          <div className={styles.kpiCard} style={{ '--kpi-accent': '#D97706' }}>
            <div className={styles.kpiTop}>
              <div className={styles.kpiIconWrap} style={{ background: '#FEF3C7', color: '#D97706' }}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
                </svg>
              </div>
              <span className={styles.kpiTrend} data-active={kpi.appointmentsToday > 0}>
                {kpi.appointmentsToday > 0 ? `${kpi.appointmentsToday} programadas` : 'Sin citas hoy'}
              </span>
            </div>
            <strong className={styles.kpiValue}>{kpi.appointmentsToday}</strong>
            <span className={styles.kpiLabel}>Citas hoy</span>
          </div>

          <div className={styles.kpiCard} style={{ '--kpi-accent': '#059669' }}>
            <div className={styles.kpiTop}>
              <div className={styles.kpiIconWrap} style={{ background: '#D1FAE5', color: '#059669' }}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                </svg>
              </div>
              <span className={styles.kpiTrendGood}>Hoy</span>
            </div>
            <strong className={styles.kpiValue}>{kpi.completedToday}</strong>
            <span className={styles.kpiLabel}>Servicios completados</span>
          </div>

          <div className={styles.kpiCard} style={{ '--kpi-accent': '#F97316' }}>
            <div className={styles.kpiTop}>
              <div className={styles.kpiIconWrap} style={{ background: '#FFEDD5', color: '#F97316' }}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 0 1-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 0 1 .947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 0 1 2.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 0 1 2.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 0 1 .947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 0 1-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 0 1-2.287-.947ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                </svg>
              </div>
              <span className={styles.kpiTrend} data-active={kpi.motorcyclesInService > 0}>
                {kpi.motorcyclesInService > 0 ? 'En servicio' : 'Taller libre'}
              </span>
            </div>
            <strong className={styles.kpiValue}>{kpi.motorcyclesInService}</strong>
            <span className={styles.kpiLabel}>Motos en taller</span>
          </div>

        </div>
      )}

      {/* Main content row */}
      <div className={styles.mainRow}>

        {/* Activity feed */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
            </svg>
            Actividad reciente
          </h2>
          {loading ? (
            <p className={styles.emptyHint} aria-live="polite">Cargando actividad…</p>
          ) : activityFeed.length === 0 ? (
            <p className={styles.emptyHint}>No hay actividad registrada aún.</p>
          ) : (
            <ol className={styles.actFeed} aria-label="Actividad reciente">
              {activityFeed.map((evt) => (
                <li key={evt.id} className={styles.actItem}>
                  <ActivityIcon type={evt.type} />
                  <div className={styles.actInfo}>
                    <span className={styles.actTitle}>{evt.title}</span>
                    {evt.sub ? <span className={styles.actSub}>{evt.sub}</span> : null}
                  </div>
                  <span className={styles.actDate}>{evt.date}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Right column */}
        <div className={styles.rightCol}>

          {/* Alerts */}
          <div className={`${styles.panel} ${totalAlerts > 0 ? styles.panelAlert : ''}`}>
            <div className={styles.panelTitleRow}>
              <h2 className={styles.panelTitle}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
                Alertas
              </h2>
              {totalAlerts > 0 ? (
                <span className={styles.alertBadge}>{totalAlerts}</span>
              ) : null}
            </div>

            {loading ? (
              <p className={styles.emptyHint}>Cargando…</p>
            ) : totalAlerts === 0 ? (
              <p className={styles.emptyHintGood}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                </svg>
                Todo bajo control
              </p>
            ) : (
              <div className={styles.alertSection}>
                {lowStockItems.map((item) => (
                  <div key={`inv-${item.id}`} className={styles.alertRow}>
                    <span className={styles.alertDot} style={{ background: item.status === 'Agotado' ? '#DC2626' : '#D97706' }} />
                    <div className={styles.alertInfo}>
                      <span className={styles.alertName}>{item.name}</span>
                      <span className={styles.alertSub}>Inventario · {item.code}</span>
                    </div>
                    <span className={styles.alertTag} style={{
                      background: item.status === 'Agotado' ? '#FEE2E2' : '#FEF3C7',
                      color:      item.status === 'Agotado' ? '#DC2626' : '#D97706',
                    }}>
                      {item.status}
                    </span>
                  </div>
                ))}

                {listoOrders.map((o) => (
                  <div key={`listo-${o.id}`} className={styles.alertRow}>
                    <span className={styles.alertDot} style={{ background: '#7C3AED' }} />
                    <div className={styles.alertInfo}>
                      <span className={styles.alertName}>
                        {[o.client_name, o.client_last_name].filter(Boolean).join(' ')}
                      </span>
                      <span className={styles.alertSub}>Orden {o.order_number} lista</span>
                    </div>
                    <span className={styles.alertTag} style={{ background: '#EDE9FE', color: '#7C3AED' }}>Entregar</span>
                  </div>
                ))}

                {pendingAppointments.slice(0, 2).map((a) => (
                  <div key={`apt-${a.id}`} className={styles.alertRow}>
                    <span className={styles.alertDot} style={{ background: '#D97706' }} />
                    <div className={styles.alertInfo}>
                      <span className={styles.alertName}>{a.client_name}</span>
                      <span className={styles.alertSub}>
                        Cita · {a.requested_date
                          ? new Date(a.requested_date).toLocaleDateString('es-CO')
                          : 'Sin fecha'}
                      </span>
                    </div>
                    <span className={styles.alertTag} style={{ background: '#FEF3C7', color: '#D97706' }}>Pendiente</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Orders by status */}
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                <path fillRule="evenodd" d="M4 4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-5L9 4H4Z" clipRule="evenodd" />
              </svg>
              Órdenes por estado
            </h2>
            <div className={styles.statusList}>
              {loading ? (
                <p className={styles.emptyHint}>Cargando…</p>
              ) : (
                ordersByStatus.map((s) => (
                  <div key={s.key} className={styles.statusRow}>
                    <span className={styles.statusDot} style={{ background: s.bg, color: s.color }} />
                    <span className={styles.statusLabel}>{s.key}</span>
                    <span className={styles.statusCount}>
                      {s.key === 'Entregada' ? `${s.count} hoy` : s.count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick links */}
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                <path d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" />
              </svg>
              Accesos rápidos
            </h2>
            <div className={styles.quickLinks}>
              {QUICK_LINKS.map((l) => (
                <Link key={l.to} to={l.to} className={styles.quickLink}>
                  <span className={styles.quickIcon} aria-hidden="true">{l.icon}</span>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

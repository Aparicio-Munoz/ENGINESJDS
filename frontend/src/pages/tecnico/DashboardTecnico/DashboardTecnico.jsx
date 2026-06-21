import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { technicianApi } from '../../../api'
import { useAuth } from '../../../hooks/useAuth'
import styles from './DashboardTecnico.module.css'

const STATUS_COLORS = {
  Pendiente:             { bg: '#dbeafe', color: '#1d4ed8' },
  'En reparación':       { bg: '#ffedd5', color: '#9a3412' },
  'Esperando repuesto':  { bg: '#fef3c7', color: '#92400e' },
  'Lista para entrega':  { bg: '#ede9fe', color: '#6d28d9' },
}

function formatCurrency(n) {
  if (n === null || n === undefined) return '$ 0'
  return `$ ${Number(n).toLocaleString('es-CO')}`
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO')
}

export function DashboardTecnico() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await technicianApi.getDashboard()
      if (mountedRef.current) setData(result)
    } catch {
      if (mountedRef.current) setError('No se pudo cargar el dashboard.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    loadData()
    const interval = setInterval(loadData, 60_000)
    return () => { mountedRef.current = false; clearInterval(interval) }
  }, [loadData])

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  if (error && !loading) {
    return (
      <section className={styles.page}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Panel técnico</p>
          <h1 className={styles.title}>Dashboard</h1>
        </div>
        <div className={styles.errorState}>
          <p>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={loadData}>Reintentar</button>
        </div>
      </section>
    )
  }

  const stats = data?.stats ?? {}
  const earnings = data?.earnings ?? {}

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            Panel técnico · {now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className={styles.title}>
            {greeting}, <span className={styles.accent}>{user?.username || 'Técnico'}</span>
          </h1>
          <p className={styles.subtitle}>Resumen de tu actividad y órdenes asignadas.</p>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          Cargando dashboard…
        </div>
      ) : (
        <>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard} style={{ '--kpi-accent': '#EA580C' }}>
              <div className={styles.kpiIconWrap} style={{ background: '#FFEDD5', color: '#EA580C' }}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fillRule="evenodd" d="M4 4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-5L9 4H4Z" clipRule="evenodd" /></svg>
              </div>
              <strong className={styles.kpiValue}>{stats.active_orders ?? 0}</strong>
              <span className={styles.kpiLabel}>Órdenes activas</span>
            </div>

            <div className={styles.kpiCard} style={{ '--kpi-accent': '#059669' }}>
              <div className={styles.kpiIconWrap} style={{ background: '#D1FAE5', color: '#059669' }}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
              </div>
              <strong className={styles.kpiValue}>{stats.delivered ?? 0}</strong>
              <span className={styles.kpiLabel}>Entregadas</span>
            </div>

            <div className={styles.kpiCard} style={{ '--kpi-accent': '#2563EB' }}>
              <div className={styles.kpiIconWrap} style={{ background: '#DBEAFE', color: '#2563EB' }}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" /></svg>
              </div>
              <strong className={styles.kpiValue}>{earnings.total_services ?? 0}</strong>
              <span className={styles.kpiLabel}>Servicios realizados</span>
            </div>

            <div className={styles.kpiCard} style={{ '--kpi-accent': '#7C3AED' }}>
              <div className={styles.kpiIconWrap} style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M10.75 10.818v2.614A3.13 3.13 0 0 0 11.888 13a3.13 3.13 0 0 0 2.245-.724l.148-.124.007.036a3.13 3.13 0 0 0 2.38.9h.17a.75.75 0 0 0 0-1.5h-.17a1.63 1.63 0 0 1-1.24-.469l-.168-.175a.75.75 0 0 0-1.206.263 1.63 1.63 0 0 1-2.966-.598V10.5h3.562a.75.75 0 0 0 0-1.5H11.89a1.63 1.63 0 0 1 2.966-.598.75.75 0 0 0 1.206.263l.168-.175a1.63 1.63 0 0 1 1.24-.47h.17a.75.75 0 0 0 0-1.5h-.17a3.13 3.13 0 0 0-2.38.9l-.007.036-.148-.124A3.13 3.13 0 0 0 11.888 7 3.13 3.13 0 0 0 10.75 7.432V4.818a.75.75 0 0 0-1.5 0v2.614A3.13 3.13 0 0 0 8.112 7a3.13 3.13 0 0 0-2.245.724l-.148.124-.007-.036a3.13 3.13 0 0 0-2.38-.9H3.16a.75.75 0 1 0 0 1.5h.172a1.63 1.63 0 0 1 1.24.47l.168.174a.75.75 0 0 0 1.206-.263A1.63 1.63 0 0 1 8.912 9.39V9.5H5.35a.75.75 0 0 0 0 1.5h3.562v.318a1.63 1.63 0 0 1-2.966.598.75.75 0 0 0-1.206-.263l-.168.175a1.63 1.63 0 0 1-1.24.469H3.16a.75.75 0 1 0 0 1.5h.172a3.13 3.13 0 0 0 2.38-.9l.007-.036.148.124A3.13 3.13 0 0 0 8.112 13a3.13 3.13 0 0 0 1.138-.432v2.614a.75.75 0 0 0 1.5 0v-4.364Z" /></svg>
              </div>
              <strong className={styles.kpiValue}>{formatCurrency(earnings.monthly_earnings)}</strong>
              <span className={styles.kpiLabel}>Ganancia del mes</span>
            </div>
          </div>

          <div className={styles.mainRow}>
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>Órdenes activas</h2>
              {data?.recentOrders?.length > 0 ? (
                <div className={styles.orderList}>
                  {data.recentOrders.map((o) => (
                    <Link key={o.id} to="/admin/ordenes-tecnico" className={styles.orderItem}>
                      <div className={styles.orderInfo}>
                        <strong>{o.order_number}</strong>
                        <span className={styles.orderSub}>{o.client_name} · {o.motorcycle_plate} {o.motorcycle_brand}</span>
                      </div>
                      <span className={styles.statusBadge} style={STATUS_COLORS[o.status] ?? {}}>
                        {o.status}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyHint}>No tienes órdenes activas.</p>
              )}
              <Link to="/admin/ordenes-tecnico" className={styles.viewAllLink}>
                Ver todas las órdenes
              </Link>
            </div>

            <div className={styles.rightCol}>
              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>Estado de órdenes</h2>
                <div className={styles.statusList}>
                  {Object.entries({
                    Pendiente: stats.pending ?? 0,
                    'En reparación': stats.in_progress ?? 0,
                    'Esperando repuesto': stats.waiting_parts ?? 0,
                    'Lista para entrega': stats.ready ?? 0,
                  }).map(([label, count]) => (
                    <div key={label} className={styles.statusRow}>
                      <span className={styles.statusDot} style={{ background: STATUS_COLORS[label]?.bg, color: STATUS_COLORS[label]?.color }} />
                      <span className={styles.statusLabel}>{label}</span>
                      <span className={styles.statusCount}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>Accesos rápidos</h2>
                <div className={styles.quickLinks}>
                  <Link to="/admin/ordenes-tecnico" className={styles.quickLink}>Mis órdenes</Link>
                  <Link to="/admin/motos-asignadas" className={styles.quickLink}>Motos asignadas</Link>
                  <Link to="/admin/solicitud-repuestos" className={styles.quickLink}>Solicitar repuesto</Link>
                  <Link to="/admin/ganancias" className={styles.quickLink}>Mis ganancias</Link>
                </div>
              </div>

              {data?.pendingRequests > 0 ? (
                <div className={`${styles.panel} ${styles.panelAlert}`}>
                  <h2 className={styles.panelTitle}>Solicitudes pendientes</h2>
                  <p className={styles.alertText}>
                    Tienes <strong>{data.pendingRequests}</strong> solicitud(es) de repuestos pendiente(s).
                  </p>
                  <Link to="/admin/solicitud-repuestos" className={styles.viewAllLink}>
                    Ver solicitudes
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

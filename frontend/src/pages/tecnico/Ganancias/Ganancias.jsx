import { useEffect, useRef, useState } from 'react'
import { technicianApi } from '../../../api'
import styles from './Ganancias.module.css'

function formatCurrency(n) {
  if (n === null || n === undefined) return '$ 0'
  return `$ ${Number(n).toLocaleString('es-CO')}`
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO')
}

export function Ganancias() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    loadEarnings()
    return () => { mountedRef.current = false }
  }, [])

  async function loadEarnings() {
    setLoading(true)
    setError(null)
    try {
      const result = await technicianApi.getEarnings()
      if (mountedRef.current) setData(result)
    } catch {
      if (mountedRef.current) setError('No se pudieron cargar las ganancias.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  const summary = data?.summary ?? {}
  const monthly = data?.monthly ?? []
  const history = data?.history ?? []

  const maxEarning = monthly.length > 0
    ? Math.max(...monthly.map((m) => Number(m.earnings)), 1)
    : 1

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Panel técnico</p>
          <h1>Mis Ganancias</h1>
          <p>Resumen de ingresos generados por tus servicios realizados.</p>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingState}><div className={styles.spinner} />Cargando ganancias…</div>
      ) : error ? (
        <div className={styles.errorState}>
          <p>{error}</p>
          <button type="button" className={styles.retryButton} onClick={loadEarnings}>Reintentar</button>
        </div>
      ) : (
        <>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard} style={{ '--kpi-accent': '#059669' }}>
              <span className={styles.kpiLabel}>Hoy</span>
              <strong className={styles.kpiValue}>{formatCurrency(summary.daily_earnings)}</strong>
            </div>
            <div className={styles.kpiCard} style={{ '--kpi-accent': '#2563EB' }}>
              <span className={styles.kpiLabel}>Quincena (15 días)</span>
              <strong className={styles.kpiValue}>{formatCurrency(summary.biweekly_earnings)}</strong>
            </div>
            <div className={styles.kpiCard} style={{ '--kpi-accent': '#7C3AED' }}>
              <span className={styles.kpiLabel}>Mes actual</span>
              <strong className={styles.kpiValue}>{formatCurrency(summary.monthly_earnings)}</strong>
            </div>
            <div className={styles.kpiCard} style={{ '--kpi-accent': '#EA580C' }}>
              <span className={styles.kpiLabel}>Total histórico</span>
              <strong className={styles.kpiValue}>{formatCurrency(summary.total_revenue)}</strong>
            </div>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{summary.total_services ?? 0}</span>
              <span className={styles.statLabel}>Servicios realizados</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{summary.completed_orders ?? 0}</span>
              <span className={styles.statLabel}>Órdenes completadas</span>
            </div>
          </div>

          {monthly.length > 0 ? (
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>Ganancias por mes (últimos 6 meses)</h2>
              <div className={styles.chartArea}>
                {monthly.map((m) => {
                  const pct = Math.max((Number(m.earnings) / maxEarning) * 100, 2)
                  return (
                    <div key={m.month} className={styles.barRow}>
                      <span className={styles.barLabel}>{m.month_label}</span>
                      <div className={styles.barTrack}>
                        <div className={styles.barFill} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={styles.barValue}>{formatCurrency(m.earnings)}</span>
                      <span className={styles.barMeta}>{m.services} svc · {m.orders} ord</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {history.length > 0 ? (
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>Historial de trabajos completados</h2>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Orden</th>
                      <th>Motocicleta</th>
                      <th>Cliente</th>
                      <th>Fecha entrega</th>
                      <th>Mi ganancia</th>
                      <th>Total orden</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td data-label="Orden"><span className={styles.orderNumber}>{h.order_number}</span></td>
                        <td data-label="Moto">
                          <div>{h.motorcycle_plate}</div>
                          <div className={styles.subText}>{h.motorcycle_brand} {h.motorcycle_model}</div>
                        </td>
                        <td data-label="Cliente">{h.client_name}</td>
                        <td data-label="Entrega">{formatDate(h.actual_delivery_date)}</td>
                        <td data-label="Mi ganancia"><strong className={styles.earningValue}>{formatCurrency(h.my_earnings)}</strong></td>
                        <td data-label="Total">{formatCurrency(h.final_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>Aún no tienes trabajos completados.</div>
          )}
        </>
      )}
    </section>
  )
}

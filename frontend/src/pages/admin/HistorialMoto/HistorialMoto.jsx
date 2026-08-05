import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { historyApi } from '../../../api/historyApi'
import { useToast } from '../../../hooks/useToast'
import styles from './HistorialMoto.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

function fmtCOP(n) {
  if (n === null || n === undefined) return '$ 0'
  return `$ ${Math.round(Number(n)).toLocaleString('es-CO')}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATUS_COLORS = {
  Pendiente: '#2563EB', 'En reparación': '#EA580C', 'Esperando repuesto': '#D97706',
  'Lista para entrega': '#7C3AED', Entregada: '#059669', 'En proceso': '#EA580C', Listo: '#7C3AED',
}

export function HistorialMoto() {
  const { id } = useParams()
  const toast = useToast()
  const mountedRef = useRef(true)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    mountedRef.current = true
    loadHistory()
    return () => { mountedRef.current = false }
  }, [id])

  async function loadHistory() {
    setLoading(true); setError(null)
    try {
      const result = await historyApi.getFullHistory(id)
      if (mountedRef.current) setData(result)
    } catch (err) {
      if (mountedRef.current) setError(err?.response?.data?.message ?? 'Error al cargar el historial.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  async function handlePDF() {
    try { await historyApi.downloadPDF(id); toast.success('PDF descargado') } catch { toast.error('Error al descargar PDF') }
  }

  function handleExcel() {
    if (!data) return
    const wb = XLSX.utils.book_new()
    if (data.timeline?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        data.timeline.map((t) => ({ OT: t.order_number, Fecha: fmtDate(t.entry_date), Estado: t.order_status, Técnico: t.technician_name ?? '—', Diagnóstico: t.diagnostic_notes ?? '—', Total: Number(t.final_price) }))
      ), 'Historial')
    }
    if (data.services?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        data.services.map((s) => ({ Servicio: s.service_name, Cantidad: s.quantity, Precio: Number(s.total_price), OT: s.order_number, Técnico: s.technician ?? '—' }))
      ), 'Servicios')
    }
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([buf]), `Historial_${data.motorcycle.plate}.xlsx`)
  }

  if (loading) return <section className={styles.page}><div className={styles.loadingState}><div className={styles.spinner} />Cargando historial…</div></section>
  if (error) return <section className={styles.page}><div className={styles.loadingState}><p>{error}</p><button className={styles.retryBtn} onClick={loadHistory}>Reintentar</button></div></section>
  if (!data) return null

  const m = data.motorcycle
  const s = data.stats
  const chartData = data.yearlyCosts?.length ? {
    labels: data.yearlyCosts.map((y) => String(y.year)),
    datasets: [{ label: 'Gasto anual', data: data.yearlyCosts.map((y) => Number(y.total_cost)), backgroundColor: '#F9731688', borderColor: '#F97316', borderWidth: 2, borderRadius: 6 }],
  } : null

  return (
    <section className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Historial clínico</p>
          <h1 className={styles.title}><span className={styles.plate}>{m.plate}</span></h1>
          <p className={styles.subtitle}>{m.brand} {m.model} {m.year} {m.engine_cc ? `— ${m.engine_cc}cc` : ''}</p>
          <p className={styles.clientInfo}>Cliente: <strong>{m.client_name ?? 'Sin propietario asignado'}</strong> · {m.client_phone ?? '—'}</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.exportBtn} onClick={handlePDF}>PDF</button>
          <button className={styles.exportBtn} onClick={handleExcel}>Excel</button>
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.kpiGrid}>
        {[
          { label: 'Visitas al taller', value: s.totalVisits, color: '#2563EB' },
          { label: 'Total invertido', value: fmtCOP(s.totalSpent), color: '#F97316' },
          { label: 'Promedio por visita', value: fmtCOP(s.averageSpent), color: '#7C3AED' },
          { label: 'Servicio más frecuente', value: s.favoriteService ?? '—', color: '#059669' },
          { label: 'Última visita', value: fmtDate(s.lastVisit), color: '#D97706' },
        ].map((kpi) => (
          <div key={kpi.label} className={styles.kpiCard} style={{ '--kpi-color': kpi.color }}>
            <span className={styles.kpiLabel}>{kpi.label}</span>
            <strong className={styles.kpiValue}>{kpi.value}</strong>
          </div>
        ))}
      </div>

      {/* Timeline */}
      {data.timeline?.length > 0 ? (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Historial de visitas</h2>
          <div className={styles.timeline}>
            {data.timeline.map((entry) => (
              <div key={entry.order_id} className={styles.timelineItem}>
                <div className={styles.tlDot} style={{ background: STATUS_COLORS[entry.order_status] ?? '#94A3B8' }} />
                <div className={styles.tlContent}>
                  <div className={styles.tlHeader}>
                    <span className={styles.tlOrder}>{entry.order_number}</span>
                    <span className={styles.tlDate}>{fmtDate(entry.entry_date)}</span>
                    <span className={styles.tlStatus} style={{ color: STATUS_COLORS[entry.order_status] ?? '#64748B' }}>{entry.order_status}</span>
                  </div>
                  {entry.diagnostic_notes ? <p className={styles.tlDiag}>{entry.diagnostic_notes}</p> : null}
                  <div className={styles.tlMeta}>
                    {entry.technician_name ? <span>Técnico: {entry.technician_name}</span> : null}
                    <strong className={styles.tlCost}>{fmtCOP(entry.final_price)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : <div className={styles.emptyState}>Sin visitas registradas para esta motocicleta.</div>}

      {/* Orders table */}
      {data.timeline?.length > 0 ? (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Órdenes de trabajo</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead><tr><th>OT</th><th>Fecha</th><th>Estado</th><th>Técnico</th><th>Costo</th></tr></thead>
              <tbody>
                {data.timeline.map((t) => (
                  <tr key={t.order_id}>
                    <td data-label="OT"><span className={styles.orderNum}>{t.order_number}</span></td>
                    <td data-label="Fecha">{fmtDate(t.entry_date)}</td>
                    <td data-label="Estado"><span style={{ color: STATUS_COLORS[t.order_status] ?? '#64748B', fontWeight: 700 }}>{t.order_status}</span></td>
                    <td data-label="Técnico">{t.technician_name ?? '—'}</td>
                    <td data-label="Costo"><strong>{fmtCOP(t.final_price)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Chart */}
      {chartData ? (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Evolución del gasto por año</h2>
          <div className={styles.chartWrap}>
            <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1E293B', titleColor: '#F97316', bodyColor: '#E2E8F0' } }, scales: { x: { ticks: { color: '#64748B' }, grid: { color: 'rgba(226,232,240,0.3)' } }, y: { ticks: { color: '#64748B' }, grid: { color: 'rgba(226,232,240,0.3)' } } } }} />
          </div>
        </div>
      ) : null}
    </section>
  )
}

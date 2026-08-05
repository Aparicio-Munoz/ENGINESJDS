import { useEffect, useRef, useState } from 'react'
import { technicianApi } from '../../../api'
import styles from './MotosAsignadas.module.css'

const STATUS_STYLES = {
  Pendiente:            { background: '#dbeafe', color: '#1d4ed8' },
  'En reparación':      { background: '#ffedd5', color: '#9a3412' },
  'Esperando repuesto': { background: '#fef3c7', color: '#92400e' },
  'Lista para entrega': { background: '#ede9fe', color: '#6d28d9' },
  'En proceso':         { background: '#ffedd5', color: '#9a3412' },
  Listo:                { background: '#ede9fe', color: '#6d28d9' },
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO')
}

export function MotosAsignadas() {
  const [motos, setMotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    loadMotos()
    return () => { mountedRef.current = false }
  }, [])

  async function loadMotos() {
    setLoading(true)
    setError(null)
    try {
      const data = await technicianApi.getMotorcycles()
      if (mountedRef.current) setMotos(data ?? [])
    } catch {
      if (mountedRef.current) setError('No se pudieron cargar las motocicletas.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Panel técnico</p>
          <h1>Motocicletas Asignadas</h1>
          <p>Motocicletas de tus órdenes activas con información del cliente y diagnóstico.</p>
        </div>
      </div>

      <div className={styles.summaryBar}>
        <span>{motos.length} motocicleta(s) en tus órdenes activas</span>
      </div>

      {loading ? (
        <div className={styles.loadingState}><div className={styles.spinner} />Cargando motocicletas…</div>
      ) : error ? (
        <div className={styles.errorState}>
          <p>{error}</p>
          <button type="button" className={styles.retryButton} onClick={loadMotos}>Reintentar</button>
        </div>
      ) : motos.length === 0 ? (
        <div className={styles.emptyState}>No tienes motocicletas asignadas actualmente.</div>
      ) : (
        <div className={styles.cardGrid}>
          {motos.map((m) => {
            const isExpanded = expandedId === m.order_id
            return (
              <div key={m.order_id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.plateTag}>{m.plate}</div>
                  <span className={styles.statusBadge} style={STATUS_STYLES[m.order_status] ?? {}}>
                    {m.order_status}
                  </span>
                </div>
                <h3 className={styles.cardTitle}>{m.brand} {m.model} {m.year}</h3>
                <div className={styles.cardMeta}>
                  <span>{m.engine_cc ? `${m.engine_cc}cc` : '—'}</span>
                </div>
                <div className={styles.cardInfo}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Cliente</span>
                    <span>{m.client_name}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Teléfono</span>
                    <span>{m.client_phone || '—'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Orden</span>
                    <span className={styles.orderNum}>{m.order_number}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Ingreso</span>
                    <span>{formatDate(m.entry_date)}</span>
                  </div>
                </div>
                {m.diagnostic_notes ? (
                  <>
                    <button
                      className={styles.expandBtn}
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : m.order_id)}
                    >
                      {isExpanded ? 'Ocultar diagnóstico' : 'Ver diagnóstico'}
                    </button>
                    {isExpanded ? (
                      <p className={styles.diagnosticText}>{m.diagnostic_notes}</p>
                    ) : null}
                  </>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

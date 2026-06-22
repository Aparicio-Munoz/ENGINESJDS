import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { apiClient } from '../../api/apiClient'
import styles from './Tracking.module.css'

const STATUS_ORDER = ['Recibida', 'En reparación', 'Esperando repuesto', 'Lista para entrega', 'Entregada']

const STATUS_ICONS = {
  Recibida:             '1',
  'En reparación':      '2',
  'Esperando repuesto': '3',
  'Lista para entrega': '4',
  Entregada:            '5',
}

function formatDate(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('es-CO', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function Tracking() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    loadTracking()

    const { protocol, hostname } = window.location
    const socket = io(`${protocol}//${hostname}:3000`, { transports: ['websocket', 'polling'] })
    socket.emit('join-tracking', token)
    socket.on('TRACKING_UPDATED', () => { loadTracking() })

    return () => { mountedRef.current = false; socket.disconnect() }
  }, [token])

  async function loadTracking() {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get(`/public/tracking/${token}`)
      if (mountedRef.current) setData(res.data.data)
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err?.response?.status === 404
            ? 'No se encontró información con este código de seguimiento.'
            : 'Error al consultar el seguimiento. Intenta de nuevo.'
        )
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  const currentIdx = data ? STATUS_ORDER.indexOf(data.status) : -1

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />

      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandMark}>◈</span>
          ENGINES JDS
        </Link>
      </header>

      <main className={styles.main}>
        <div className={styles.container}>
          <p className={styles.eyebrow}>Seguimiento en tiempo real</p>
          <h1 className={styles.title}>Estado de tu motocicleta</h1>

          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>Consultando estado…</p>
            </div>
          ) : error ? (
            <div className={styles.errorState}>
              <div className={styles.errorIcon}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="32" height="32">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
              </div>
              <p className={styles.errorText}>{error}</p>
              <button className={styles.retryBtn} type="button" onClick={loadTracking}>
                Reintentar
              </button>
            </div>
          ) : data ? (
            <>
              {/* Motorcycle card */}
              <section className={styles.motoCard}>
                <div className={styles.motoHeader}>
                  <div className={styles.plateTag}>{data.motorcycle.plate}</div>
                  <span className={styles.orderTag}>OT {data.order_number}</span>
                </div>
                <h2 className={styles.motoName}>
                  {data.motorcycle.brand} {data.motorcycle.model} {data.motorcycle.year}
                </h2>
                <div className={styles.motoMeta}>
                  {data.motorcycle.color ? <span>{data.motorcycle.color}</span> : null}
                  {data.motorcycle.engine_cc ? <span>{data.motorcycle.engine_cc}cc</span> : null}
                </div>
              </section>

              {/* Status stepper */}
              <section className={styles.statusSection}>
                <div className={styles.stepper}>
                  {STATUS_ORDER.map((s, i) => {
                    const isDone = i <= currentIdx
                    const isCurrent = i === currentIdx
                    return (
                      <div key={s} className={`${styles.step} ${isDone ? styles.stepDone : ''} ${isCurrent ? styles.stepCurrent : ''}`}>
                        <div className={styles.stepDot}>
                          {isDone && !isCurrent ? (
                            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <span>{STATUS_ICONS[s]}</span>
                          )}
                        </div>
                        {i < STATUS_ORDER.length - 1 ? <div className={`${styles.stepLine} ${i < currentIdx ? styles.stepLineDone : ''}`} /> : null}
                        <span className={styles.stepLabel}>{s}</span>
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* Info grid */}
              <section className={styles.infoGrid}>
                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Estado actual</span>
                  <span className={styles.infoValueAccent}>{data.status}</span>
                </div>
                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Fecha de ingreso</span>
                  <span className={styles.infoValue}>{formatDate(data.entry_date) || '—'}</span>
                </div>
                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Entrega estimada</span>
                  <span className={styles.infoValue}>{formatDate(data.estimated_delivery_date) || 'Por confirmar'}</span>
                </div>
                {data.actual_delivery_date ? (
                  <div className={styles.infoCard}>
                    <span className={styles.infoLabel}>Fecha de entrega</span>
                    <span className={styles.infoValueGreen}>{formatDate(data.actual_delivery_date)}</span>
                  </div>
                ) : null}
              </section>

              {/* Diagnostic */}
              {data.diagnostic ? (
                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>Diagnóstico</h3>
                  <p className={styles.diagnosticText}>{data.diagnostic}</p>
                </section>
              ) : null}

              {/* Services */}
              {data.services?.length > 0 ? (
                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>Servicios realizados</h3>
                  <div className={styles.serviceList}>
                    {data.services.map((svc, i) => (
                      <div key={i} className={styles.serviceItem}>
                        <div className={styles.serviceDot} />
                        <div className={styles.serviceInfo}>
                          <strong>{svc.name}</strong>
                          {svc.description ? <span className={styles.serviceDesc}>{svc.description}</span> : null}
                          {svc.quantity > 1 ? <span className={styles.serviceMeta}>Cantidad: {svc.quantity}</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {/* Timeline */}
              {data.timeline?.length > 0 ? (
                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>Historial</h3>
                  <div className={styles.timeline}>
                    {data.timeline.map((t, i) => (
                      <div key={i} className={styles.timelineItem}>
                        <div className={styles.timelineDot} />
                        <div className={styles.timelineContent}>
                          <span className={styles.timelineTransition}>
                            {t.from || 'Inicio'} → {t.to}
                          </span>
                          <span className={styles.timelineDate}>{formatDateTime(t.date)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {/* PDF download */}
              <section className={styles.pdfSection}>
                <a
                  className={styles.pdfBtn}
                  href={`${apiClient.defaults.baseURL}/public/tracking/${token}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                    <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                    <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                  </svg>
                  Descargar orden de trabajo (PDF)
                </a>
              </section>
            </>
          ) : null}
        </div>
      </main>

      <footer className={styles.footer}>
        <p>ENGINES JDS — Taller especializado en motocicletas</p>
      </footer>
    </div>
  )
}

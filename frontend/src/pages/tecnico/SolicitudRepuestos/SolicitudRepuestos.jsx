import { useCallback, useEffect, useRef, useState } from 'react'
import { technicianApi } from '../../../api'
import { useToast } from '../../../hooks/useToast'
import styles from './SolicitudRepuestos.module.css'

const REQUEST_STATUSES = ['Pendiente', 'Aprobada', 'Rechazada', 'Entregada']

const STATUS_STYLES = {
  Pendiente:  { background: '#fef3c7', color: '#92400e' },
  Aprobada:   { background: '#d1fae5', color: '#047857' },
  Rechazada:  { background: '#fee2e2', color: '#b91c1c' },
  Entregada:  { background: '#dbeafe', color: '#1d4ed8' },
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO')
}

function emptyForm() {
  return { order_id: '', part_name: '', quantity: '1', urgency: 'Normal', notes: '' }
}

export function SolicitudRepuestos() {
  const toast = useToast()
  const mountedRef = useRef(true)

  const [requests, setRequests] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})
  const [creating, setCreating] = useState(false)

  const [activeOrders, setActiveOrders] = useState([])

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await technicianApi.getPartRequests({
        status: filterStatus || undefined,
        page,
        limit: 20,
      })
      if (!mountedRef.current) return
      setRequests(res.data ?? [])
      setPagination(res.pagination ?? null)
    } catch {
      if (!mountedRef.current) return
      setError('No se pudieron cargar las solicitudes.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [page, filterStatus])

  useEffect(() => { loadRequests() }, [loadRequests])

  async function openCreate() {
    setForm(emptyForm())
    setFormErrors({})
    setCreateOpen(true)
    try {
      const res = await technicianApi.getOrders({ limit: 100 })
      if (mountedRef.current) {
        setActiveOrders((res.data ?? []).filter((o) => o.status !== 'Entregada'))
      }
    } catch { /* ignore */ }
  }

  async function handleCreate(e) {
    e.preventDefault()
    const errs = {}
    if (!form.order_id) errs.order_id = 'Selecciona una orden.'
    if (!form.part_name.trim()) errs.part_name = 'Nombre del repuesto requerido.'
    if (!form.quantity || Number(form.quantity) < 1) errs.quantity = 'Mínimo 1.'
    if (Object.keys(errs).length) { setFormErrors(errs); return }

    setCreating(true)
    try {
      await technicianApi.createPartRequest({
        order_id:  Number(form.order_id),
        part_name: form.part_name.trim(),
        quantity:  Number(form.quantity),
        urgency:   form.urgency,
        notes:     form.notes.trim() || undefined,
      })
      if (!mountedRef.current) return
      toast.success('Solicitud de repuesto creada')
      setCreateOpen(false)
      loadRequests()
    } catch (err) {
      if (!mountedRef.current) return
      toast.error(err?.response?.data?.message ?? 'No se pudo crear la solicitud')
    } finally {
      if (mountedRef.current) setCreating(false)
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Panel técnico</p>
          <h1>Solicitud de Repuestos</h1>
          <p>Solicita repuestos para tus órdenes. El administrador aprobará y despachará.</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={openCreate}>
          Nueva solicitud
        </button>
      </div>

      <div className={styles.searchBar}>
        <select className={styles.filterSelect} value={filterStatus} onChange={(e) => { setPage(1); setFilterStatus(e.target.value) }}>
          <option value="">Todos los estados</option>
          {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className={styles.loadingState}><div className={styles.spinner} />Cargando solicitudes…</div>
      ) : error ? (
        <div className={styles.errorState}>
          <p>{error}</p>
          <button type="button" className={styles.retryButton} onClick={loadRequests}>Reintentar</button>
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Repuesto</th>
                  <th>Cantidad</th>
                  <th>Urgencia</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Respuesta</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td data-label="Orden">
                      <span className={styles.orderNumber}>{req.order_number}</span>
                      <div className={styles.subText}>{req.motorcycle_plate} {req.motorcycle_brand}</div>
                    </td>
                    <td data-label="Repuesto">
                      <strong>{req.part_name}</strong>
                      {req.notes ? <div className={styles.subText}>{req.notes}</div> : null}
                    </td>
                    <td data-label="Cantidad">{req.quantity}</td>
                    <td data-label="Urgencia">
                      <span className={styles.urgencyBadge} data-urgency={req.urgency}>{req.urgency}</span>
                    </td>
                    <td data-label="Estado">
                      <span className={styles.statusBadge} style={STATUS_STYLES[req.status] ?? {}}>{req.status}</span>
                    </td>
                    <td data-label="Fecha">{formatDate(req.created_at)}</td>
                    <td data-label="Respuesta">
                      {req.response_notes ? <span className={styles.responseText}>{req.response_notes}</span> : '—'}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 ? (
                  <tr><td colSpan={7} className={styles.emptyState}>
                    {filterStatus ? 'Sin solicitudes con ese estado.' : 'No has creado solicitudes de repuestos.'}
                  </td></tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 ? (
            <div className={styles.pagination}>
              <button className={styles.paginationBtn} type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Anterior</button>
              <span className={styles.pageInfo}>Página {pagination.page} de {pagination.totalPages}</span>
              <button className={styles.paginationBtn} type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente →</button>
            </div>
          ) : null}
        </>
      )}

      {/* Create modal */}
      {createOpen ? (
        <div className={styles.modalBackdrop}>
          <section className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Nueva solicitud</p>
                <h2>Solicitar repuesto</h2>
              </div>
              <button className={styles.iconButton} type="button" onClick={() => setCreateOpen(false)}>×</button>
            </div>
            <form className={styles.form} onSubmit={handleCreate}>
              <label className={styles.formField}>
                Orden de trabajo <span className={styles.required}>*</span>
                <select value={form.order_id} onChange={(e) => setForm((p) => ({ ...p, order_id: e.target.value }))}>
                  <option value="">Selecciona una orden…</option>
                  {activeOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_number} — {o.motorcycle_plate} {o.motorcycle_brand}
                    </option>
                  ))}
                </select>
                {formErrors.order_id ? <span>{formErrors.order_id}</span> : null}
              </label>

              <label className={styles.formField}>
                Nombre del repuesto <span className={styles.required}>*</span>
                <input
                  type="text"
                  maxLength={200}
                  placeholder="Ej: Filtro de aceite Honda CB190"
                  value={form.part_name}
                  onChange={(e) => setForm((p) => ({ ...p, part_name: e.target.value }))}
                />
                {formErrors.part_name ? <span>{formErrors.part_name}</span> : null}
              </label>

              <label className={styles.formField}>
                Cantidad <span className={styles.required}>*</span>
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                />
                {formErrors.quantity ? <span>{formErrors.quantity}</span> : null}
              </label>

              <label className={styles.formField}>
                Urgencia
                <select value={form.urgency} onChange={(e) => setForm((p) => ({ ...p, urgency: e.target.value }))}>
                  <option value="Normal">Normal</option>
                  <option value="Urgente">Urgente</option>
                </select>
              </label>

              <label className={`${styles.formField} ${styles.fullWidth}`}>
                Notas (opcional)
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="Especificaciones, referencia, marca preferida…"
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </label>

              <div className={styles.formActions}>
                <button className={styles.secondaryButton} type="button" disabled={creating} onClick={() => setCreateOpen(false)}>Cancelar</button>
                <button className={styles.primaryButton} type="submit" disabled={creating}>
                  {creating ? 'Creando…' : 'Crear solicitud'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}

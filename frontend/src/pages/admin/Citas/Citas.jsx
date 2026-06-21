import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { appointmentsApi, ordersApi } from '../../../api'
import { Pagination } from '../../../components/Pagination/Pagination'
import { useToast } from '../../../hooks/useToast'
import { ROUTES } from '../../../utils/routes'
import styles from './Citas.module.css'

// Statuses that allow forward transitions
const CONFIRMABLE  = ['Pendiente', 'Reprogramada']
const CANCELABLE   = ['Pendiente', 'Confirmada', 'Reprogramada']
const RESCHEDULABLE = ['Pendiente', 'Confirmada', 'Reprogramada']

const RESCHEDULE_PRESETS = [
  'Cliente no puede asistir.',
  'Motocicleta en reparación previa.',
  'Reagendamiento solicitado por el cliente.',
  'Conflicto de horario en el taller.',
]

const STATUS_STYLES = {
  Pendiente:    { background: '#FEF3C7', color: '#D97706' },
  Confirmada:   { background: '#DBEAFE', color: '#2563EB' },
  Atendida:     { background: '#D1FAE5', color: '#059669' },
  Cancelada:    { background: '#FEE2E2', color: '#DC2626' },
  Reprogramada: { background: '#EDE9FE', color: '#7C3AED' },
}

function formatDate(d) {
  if (!d) return '—'
  const iso = typeof d === 'string' ? d : String(d)
  const [y, m, day] = iso.slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}

function formatTime(t) {
  if (!t) return '—'
  return String(t).slice(0, 5)
}

function emptyReschedule() {
  return { date: '', time: '', reason: '', notes: '' }
}

export function Citas() {
  const toast = useToast()
  const navigate = useNavigate()
  const mountedRef = useRef(true)

  // ── List state ─────────────────────────────────────────────
  const [appointments, setAppointments] = useState([])
  const [pagination, setPagination]     = useState(null)
  const [page, setPage]                 = useState(1)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)

  // ── Debounced search ───────────────────────────────────────
  const [searchInput, setSearchInput]   = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const searchTimerRef = useRef(null)

  // ── Filters ────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDate, setFilterDate]     = useState('')

  // ── Confirm action ─────────────────────────────────────────
  const [confirmingId, setConfirmingId] = useState(null)

  // ── Cancel modal ───────────────────────────────────────────
  const [cancelTarget, setCancelTarget] = useState(null)  // { id, label }
  const [cancelReason, setCancelReason] = useState('')
  const [canceling, setCanceling]       = useState(false)

  // ── Delete modal ───────────────────────────────────────────
  const [deleteTarget, setDeleteTarget]         = useState(null)  // { id, label }
  const [deleteReason, setDeleteReason]         = useState('')
  const [deleteReasonError, setDeleteReasonError] = useState('')
  const [deleting, setDeleting]                 = useState(false)

  // ── Reschedule modal ───────────────────────────────────────
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [rescheduleForm, setRescheduleForm]     = useState(emptyReschedule)
  const [rescheduleErrors, setRescheduleErrors] = useState({})
  const [rescheduling, setRescheduling]         = useState(false)

  // ── "Crear orden" modal ────────────────────────────────────
  const [convertTarget, setConvertTarget]       = useState(null)
  const [convertSubmitting, setConvertSubmitting] = useState(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // ── Load ───────────────────────────────────────────────────
  const loadAppointments = useCallback(async (opts = {}) => {
    if (!opts.silent) setLoading(true)
    setError(null)
    try {
      const res = await appointmentsApi.getAll({
        search:      searchApplied || undefined,
        status:      filterStatus  || undefined,
        date:        filterDate    || undefined,
        sort:        filterDate ? 'date' : 'created_at',
        page,
        limit:       20,
      })
      if (!mountedRef.current) return
      setAppointments(res.data ?? [])
      setPagination(res.pagination ?? null)
    } catch {
      if (!mountedRef.current) return
      setError('No se pudo cargar las citas. Verifica la conexión e intenta de nuevo.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [page, searchApplied, filterStatus, filterDate])

  useEffect(() => {
    loadAppointments()
  }, [loadAppointments])

  // ── Debounce ───────────────────────────────────────────────
  function handleSearchChange(e) {
    const val = e.target.value
    setSearchInput(val)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setPage(1)
      setSearchApplied(val.trim())
    }, 400)
  }

  function handleFilterStatus(e) {
    setPage(1)
    setFilterStatus(e.target.value)
  }

  function handleFilterDate(e) {
    setPage(1)
    setFilterDate(e.target.value)
  }

  // ── Confirm appointment ────────────────────────────────────
  async function handleConfirm(appt) {
    setConfirmingId(appt.id)
    try {
      await appointmentsApi.confirm(appt.id)
      if (!mountedRef.current) return
      toast.success(`Cita de "${appt.client_name}" confirmada`)
      loadAppointments({ silent: true })
    } catch (err) {
      if (!mountedRef.current) return
      toast.error(err?.response?.data?.message ?? 'No se pudo confirmar la cita')
    } finally {
      if (mountedRef.current) setConfirmingId(null)
    }
  }

  // ── Cancel appointment ─────────────────────────────────────
  function openCancel(appt) {
    setCancelTarget({ id: appt.id, label: appt.client_name })
    setCancelReason('')
  }

  async function handleCancelConfirm() {
    if (!cancelTarget) return
    setCanceling(true)
    try {
      await appointmentsApi.cancel(cancelTarget.id, cancelReason.trim() || undefined)
      if (!mountedRef.current) return
      toast.success(`Cita de "${cancelTarget.label}" cancelada`)
      setCancelTarget(null)
      setCancelReason('')
      loadAppointments({ silent: true })
    } catch (err) {
      if (!mountedRef.current) return
      toast.error(err?.response?.data?.message ?? 'No se pudo cancelar la cita')
    } finally {
      if (mountedRef.current) setCanceling(false)
    }
  }

  // ── Delete appointment ─────────────────────────────────────
  function openDelete(appt) {
    setDeleteTarget({ id: appt.id, label: appt.client_name || 'esta cita' })
    setDeleteReason('')
    setDeleteReasonError('')
  }

  async function handleDeleteConfirm() {
    if (!deleteReason.trim()) {
      setDeleteReasonError('El motivo es obligatorio.')
      return
    }
    setDeleting(true)
    try {
      await appointmentsApi.remove(deleteTarget.id, deleteReason.trim())
      if (!mountedRef.current) return
      toast.success(`Cita de "${deleteTarget.label}" eliminada`)
      setDeleteTarget(null)
      setDeleteReason('')
      setDeleteReasonError('')
      loadAppointments({ silent: true })
    } catch (err) {
      if (!mountedRef.current) return
      toast.error(err?.response?.data?.message ?? 'No se pudo eliminar la cita')
    } finally {
      if (mountedRef.current) setDeleting(false)
    }
  }

  // ── Convert cita → OT ─────────────────────────────────────
  async function handleConvertConfirm() {
    if (!convertTarget) return
    if (!convertTarget.client_id || !convertTarget.motorcycle_id) {
      toast.error('Esta cita no tiene cliente o motocicleta registrados en el sistema.')
      return
    }
    setConvertSubmitting(true)
    try {
      await ordersApi.create({
        client_id:     convertTarget.client_id,
        motorcycle_id: convertTarget.motorcycle_id,
        appointment_id: convertTarget.id,
        problem_description: convertTarget.notes || convertTarget.service_type || '',
      })
      await appointmentsApi.attend(convertTarget.id)
      toast.success(`Orden de trabajo creada para "${convertTarget.client_name}"`)
      setConvertTarget(null)
      loadAppointments({ silent: true })
      navigate(ROUTES.adminOrdenes)
    } catch (err) {
      toast.error(err?.response?.data?.message ?? err.message ?? 'No se pudo crear la orden de trabajo')
    } finally {
      if (mountedRef.current) setConvertSubmitting(false)
    }
  }

  // ── Reschedule ─────────────────────────────────────────────
  function openReschedule(appt) {
    setRescheduleTarget(appt)
    setRescheduleForm({
      date: appt.requested_date?.slice(0, 10) ?? '',
      time: formatTime(appt.requested_time),
      reason: '',
      notes: '',
    })
    setRescheduleErrors({})
  }

  function closeReschedule() {
    setRescheduleTarget(null)
    setRescheduleForm(emptyReschedule())
    setRescheduleErrors({})
  }

  function handleRescheduleChange(e) {
    const { name, value } = e.target
    setRescheduleForm((prev) => ({ ...prev, [name]: value }))
    if (rescheduleErrors[name]) {
      setRescheduleErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  function applyPreset(text) {
    setRescheduleForm((prev) => ({
      ...prev,
      reason: prev.reason ? `${prev.reason} ${text}` : text,
    }))
    if (rescheduleErrors.reason) {
      setRescheduleErrors((prev) => ({ ...prev, reason: '' }))
    }
  }

  async function handleRescheduleConfirm(e) {
    e.preventDefault()
    const errs = {}
    if (!rescheduleForm.date.trim()) errs.date   = 'La nueva fecha es obligatoria.'
    if (!rescheduleForm.time.trim()) errs.time   = 'La nueva hora es obligatoria.'
    if (!rescheduleForm.reason.trim()) errs.reason = 'El motivo de reprogramación es obligatorio.'
    if (Object.keys(errs).length) { setRescheduleErrors(errs); return }

    setRescheduling(true)
    try {
      await appointmentsApi.reschedule(rescheduleTarget.id, {
        new_date: rescheduleForm.date,
        new_time: rescheduleForm.time,
        reason:   rescheduleForm.reason.trim(),
        notes:    rescheduleForm.notes.trim() || undefined,
      })
      if (!mountedRef.current) return
      toast.success(
        `Cita de "${rescheduleTarget.client_name}" reprogramada al ${formatDate(rescheduleForm.date)} a las ${formatTime(rescheduleForm.time)}`
      )
      closeReschedule()
      loadAppointments({ silent: true })
    } catch (err) {
      if (!mountedRef.current) return
      toast.error(err?.response?.data?.message ?? 'No se pudo reprogramar la cita')
    } finally {
      if (mountedRef.current) setRescheduling(false)
    }
  }

  // ── Stats ──────────────────────────────────────────────────
  const totalCount   = pagination?.total ?? appointments.length
  const pendingCount = appointments.filter((a) => a.status === 'Pendiente').length

  // ── Render ─────────────────────────────────────────────────
  return (
    <section className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Módulo administrativo</p>
          <h1 className={styles.title}>Citas</h1>
          <p className={styles.subtitle}>Gestión de citas agendadas por clientes.</p>
        </div>
        <div className={styles.headerStats}>
          <span className={styles.statChip}>{totalCount} citas totales</span>
          {pendingCount > 0 ? (
            <span className={`${styles.statChip} ${styles.statChipWarning}`}>
              {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
            </span>
          ) : null}
        </div>
      </div>

      {/* Filters */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Buscar por cliente, placa o servicio..."
            value={searchInput}
            onChange={handleSearchChange}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={filterStatus}
          onChange={handleFilterStatus}
        >
          <option value="">Todos los estados</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Confirmada">Confirmada</option>
          <option value="Reprogramada">Reprogramada</option>
          <option value="Atendida">Atendida</option>
          <option value="Cancelada">Cancelada</option>
        </select>
        <input
          className={styles.filterDate}
          type="date"
          value={filterDate}
          onChange={handleFilterDate}
          title="Filtrar por fecha exacta"
        />
      </div>

      {/* Loading */}
      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          Cargando citas…
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <p>{error}</p>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => loadAppointments()}
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Moto / Placa</th>
                  <th>Servicio</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => {
                  const busy = confirmingId === appt.id
                  const canConfirm    = CONFIRMABLE.includes(appt.status)
                  const canCancel     = CANCELABLE.includes(appt.status)
                  const canReschedule = RESCHEDULABLE.includes(appt.status)
                  const canConvert    = appt.status === 'Confirmada'

                  return (
                    <tr key={appt.id}>
                      <td data-label="Cliente">
                        <div className={styles.clientCell}>
                          <strong>{appt.client_name}</strong>
                          {appt.client_phone ? (
                            <span className={styles.clientPhone}>{appt.client_phone}</span>
                          ) : null}
                        </div>
                      </td>
                      <td data-label="Moto / Placa">
                        <div className={styles.motoCell}>
                          <span className={styles.plate}>{appt.motorcycle_plate || '—'}</span>
                        </div>
                      </td>
                      <td data-label="Servicio">{appt.service_type || '—'}</td>
                      <td data-label="Fecha">{formatDate(appt.requested_date)}</td>
                      <td data-label="Hora">{formatTime(appt.requested_time)}</td>
                      <td data-label="Estado">
                        <span
                          className={styles.statusBadge}
                          style={STATUS_STYLES[appt.status] ?? {}}
                        >
                          {appt.status}
                        </span>
                      </td>
                      <td data-label="Acciones">
                        <div className={styles.actions}>
                          {canConfirm ? (
                            <button
                              className={styles.confirmButton}
                              type="button"
                              disabled={busy}
                              onClick={() => handleConfirm(appt)}
                            >
                              {busy ? '…' : 'Confirmar'}
                            </button>
                          ) : null}
                          {canReschedule ? (
                            <button
                              className={styles.rescheduleButton}
                              type="button"
                              title="Reprogramar esta cita"
                              onClick={() => openReschedule(appt)}
                            >
                              <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12" aria-hidden="true">
                                <path fillRule="evenodd" d="M4.75 2a.75.75 0 0 1 .75.75V4h5V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 15 6.75v6.5A2.75 2.75 0 0 1 12.25 16H3.75A2.75 2.75 0 0 1 1 13.25v-6.5A2.75 2.75 0 0 1 3.75 4H4V2.75A.75.75 0 0 1 4.75 2Zm-.75 4.5c-.552 0-1 .448-1 1v5.75c0 .552.448 1 1 1h8.5c.552 0 1-.448 1-1V7.5c0-.552-.448-1-1-1H4Z" clipRule="evenodd" />
                              </svg>
                              Reprogramar
                            </button>
                          ) : null}
                          {canCancel ? (
                            <button
                              className={styles.cancelApptButton}
                              type="button"
                              onClick={() => openCancel(appt)}
                            >
                              Cancelar
                            </button>
                          ) : null}
                          {canConvert ? (
                            <button
                              className={styles.convertButton}
                              type="button"
                              title="Crear orden de trabajo desde esta cita"
                              onClick={() => setConvertTarget(appt)}
                            >
                              Crear orden
                            </button>
                          ) : null}
                          <button
                            className={styles.deleteButton}
                            type="button"
                            onClick={() => openDelete(appt)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.emptyState}>
                      {searchInput || filterStatus || filterDate
                        ? 'Sin resultados para los filtros aplicados.'
                        : 'No hay citas registradas. Las citas del formulario público aparecerán aquí.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            page={page}
            totalPages={pagination?.totalPages}
            total={pagination?.total}
            onPageChange={setPage}
            disabled={loading}
          />
        </>
      )}

      {/* ── Cancel modal ──────────────────────────────────── */}
      {cancelTarget ? (
        <div className={styles.convertBackdrop} role="presentation">
          <section
            className={styles.convertModal}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
          >
            <p className={`${styles.eyebrow} ${styles.eyebrowWarning}`}>Cancelar cita</p>
            <h2 id="cancel-title" className={styles.convertTitle}>
              ¿Cancelar la cita de "{cancelTarget.label}"?
            </h2>
            <p className={styles.convertDesc}>
              Esta acción cambiará el estado a <strong>Cancelada</strong>. El cliente deberá agendar una nueva cita si desea atención.
            </p>
            <label className={styles.deleteLabel}>
              Motivo (opcional)
              <textarea
                className={styles.textarea}
                rows={3}
                maxLength={500}
                placeholder="Ej: Cliente solicitó cancelación por viaje…"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </label>
            <div className={styles.convertActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                disabled={canceling}
                onClick={() => { setCancelTarget(null); setCancelReason('') }}
              >
                Volver
              </button>
              <button
                type="button"
                className={styles.cancelApptConfirmBtn}
                disabled={canceling}
                onClick={handleCancelConfirm}
              >
                {canceling ? 'Cancelando…' : 'Sí, cancelar cita'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {/* ── Delete modal ───────────────────────────────────── */}
      {deleteTarget ? (
        <div className={styles.convertBackdrop} role="presentation">
          <section
            className={styles.convertModal}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <p className={`${styles.eyebrow} ${styles.eyebrowDanger}`}>Eliminar cita</p>
            <h2 id="delete-title" className={styles.convertTitle}>
              ¿Eliminar la cita de "{deleteTarget.label}"?
            </h2>
            <p className={styles.convertDesc}>
              Esta acción es permanente y quedará registrada en los logs del sistema.
            </p>
            <label className={styles.deleteLabel}>
              Motivo de eliminación <span className={styles.required}>*</span>
              <textarea
                className={`${styles.textarea}${deleteReasonError ? ` ${styles.textareaError}` : ''}`}
                rows={3}
                maxLength={500}
                placeholder="Describe el motivo de eliminación…"
                value={deleteReason}
                onChange={(e) => {
                  setDeleteReason(e.target.value)
                  if (deleteReasonError) setDeleteReasonError('')
                }}
              />
              {deleteReasonError ? (
                <span className={styles.fieldError}>{deleteReasonError}</span>
              ) : null}
            </label>
            <div className={styles.convertActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                disabled={deleting}
                onClick={() => { setDeleteTarget(null); setDeleteReason(''); setDeleteReasonError('') }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                disabled={deleting}
                onClick={handleDeleteConfirm}
              >
                {deleting ? 'Eliminando…' : 'Eliminar permanentemente'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {/* ── "Crear orden" preview modal ─────────────────────── */}
      {/*
       * Preparación para integración futura con OrdenesTrabajo.
       * Payload que se enviará a POST /api/orders cuando el módulo esté disponible:
       *   { client_name, client_phone, motorcycle_plate, service_type, notes,
       *     client_id, motorcycle_id, appointment_id }
       */}
      {convertTarget ? (
        <div className={styles.convertBackdrop} role="presentation">
          <section
            className={styles.convertModal}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="convert-title"
          >
            <h2 id="convert-title" className={styles.convertTitle}>Crear orden de trabajo</h2>
            <p className={styles.convertDesc}>
              Se creará una orden de trabajo con estado <strong>Pendiente</strong> y la cita quedará marcada como <strong>Atendida</strong>.
            </p>
            <div className={styles.convertFields}>
              <div className={styles.convertFieldRow}>
                <span>Cliente</span>
                <strong>{convertTarget.client_name}</strong>
              </div>
              <div className={styles.convertFieldRow}>
                <span>Teléfono</span>
                <strong>{convertTarget.client_phone}</strong>
              </div>
              <div className={styles.convertFieldRow}>
                <span>Placa</span>
                <strong>{convertTarget.motorcycle_plate}</strong>
              </div>
              <div className={styles.convertFieldRow}>
                <span>Servicio</span>
                <strong>{convertTarget.service_type}</strong>
              </div>
              {convertTarget.notes ? (
                <div className={styles.convertFieldRow}>
                  <span>Notas</span>
                  <strong>{convertTarget.notes}</strong>
                </div>
              ) : null}
              {!convertTarget.client_id || !convertTarget.motorcycle_id ? (
                <div className={styles.convertFieldRow}>
                  <span style={{ color: '#F87171' }}>Advertencia</span>
                  <strong style={{ color: '#F87171' }}>La cita no tiene cliente o moto registrados en el sistema.</strong>
                </div>
              ) : null}
            </div>
            <div className={styles.convertActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setConvertTarget(null)}
                disabled={convertSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={handleConvertConfirm}
                disabled={convertSubmitting || !convertTarget.client_id || !convertTarget.motorcycle_id}
              >
                {convertSubmitting ? 'Creando...' : 'Crear orden de trabajo'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {/* ── Reschedule modal ───────────────────────────────── */}
      {rescheduleTarget ? (
        <div className={styles.convertBackdrop} role="presentation">
          <section
            className={`${styles.convertModal} ${styles.rescheduleModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reschedule-title"
          >
            <div className={styles.rescheduleHeader}>
              <div>
                <p className={styles.rescheduleEyebrow}>Reprogramar cita</p>
                <h2 id="reschedule-title" className={styles.rescheduleTitle}>
                  {rescheduleTarget.client_name}
                </h2>
                <p className={styles.rescheduleSubtitle}>
                  {rescheduleTarget.service_type || 'Sin servicio'} &mdash; actual:{' '}
                  {formatDate(rescheduleTarget.requested_date)} a las{' '}
                  {formatTime(rescheduleTarget.requested_time)}
                </p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                aria-label="Cerrar"
                onClick={closeReschedule}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleRescheduleConfirm} className={styles.rescheduleForm}>
              <div className={styles.rescheduleGrid}>
                <label className={styles.rescheduleField}>
                  Nueva fecha <span className={styles.required}>*</span>
                  <input
                    type="date"
                    name="date"
                    value={rescheduleForm.date}
                    onChange={handleRescheduleChange}
                    className={rescheduleErrors.date ? styles.inputError : ''}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {rescheduleErrors.date ? (
                    <span className={styles.fieldError}>{rescheduleErrors.date}</span>
                  ) : null}
                </label>

                <label className={styles.rescheduleField}>
                  Nueva hora <span className={styles.required}>*</span>
                  <input
                    type="time"
                    name="time"
                    value={rescheduleForm.time}
                    onChange={handleRescheduleChange}
                    className={rescheduleErrors.time ? styles.inputError : ''}
                  />
                  {rescheduleErrors.time ? (
                    <span className={styles.fieldError}>{rescheduleErrors.time}</span>
                  ) : null}
                </label>
              </div>

              <label className={styles.rescheduleField}>
                Motivo de reprogramación <span className={styles.required}>*</span>
                <textarea
                  name="reason"
                  rows={2}
                  maxLength={500}
                  value={rescheduleForm.reason}
                  onChange={handleRescheduleChange}
                  className={`${styles.rescheduleTextarea}${rescheduleErrors.reason ? ` ${styles.inputError}` : ''}`}
                  placeholder="Describe el motivo del cambio…"
                />
                {rescheduleErrors.reason ? (
                  <span className={styles.fieldError}>{rescheduleErrors.reason}</span>
                ) : null}
              </label>

              <div className={styles.presets}>
                <span className={styles.presetsLabel}>Sugerencias rápidas:</span>
                <div className={styles.presetsList}>
                  {RESCHEDULE_PRESETS.map((text) => (
                    <button
                      key={text}
                      type="button"
                      className={styles.presetChip}
                      onClick={() => applyPreset(text)}
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>

              <label className={styles.rescheduleField}>
                Observación adicional (opcional)
                <textarea
                  name="notes"
                  rows={2}
                  maxLength={500}
                  value={rescheduleForm.notes}
                  onChange={handleRescheduleChange}
                  className={styles.rescheduleTextarea}
                  placeholder="Información adicional para el técnico…"
                />
              </label>

              <div className={styles.convertActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  disabled={rescheduling}
                  onClick={closeReschedule}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.confirmBtn}
                  disabled={rescheduling}
                >
                  {rescheduling ? 'Guardando…' : 'Guardar reprogramación'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}

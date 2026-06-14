import { useCallback, useEffect, useRef, useState } from 'react'
import { clientsApi, motorcyclesApi } from '../../../api'
import { useToast } from '../../../hooks/useToast'
import styles from './Motocicletas.module.css'

const LIMIT = 20
const CURRENT_YEAR = new Date().getFullYear()

const EMPTY_FORM = {
  client_id: '',
  plate: '',
  brand: '',
  model: '',
  year: '',
  engine_cc: '',
  color: '',
  vin: '',
}

function validate(form) {
  const errors = {}
  if (!form.client_id) errors.client_id = 'Selecciona un propietario.'
  const plate = form.plate.trim().toUpperCase()
  if (!plate) errors.plate = 'La placa es obligatoria.'
  else if (!/^[A-Z0-9]{2,10}$/.test(plate)) errors.plate = 'Placa: 2–10 caracteres alfanuméricos.'
  if (!form.brand.trim()) errors.brand = 'La marca es obligatoria.'
  if (!form.model.trim()) errors.model = 'El modelo es obligatorio.'
  const year = Number(form.year)
  if (!form.year.trim()) errors.year = 'El año es obligatorio.'
  else if (!Number.isInteger(year) || year < 1980 || year > CURRENT_YEAR + 1) {
    errors.year = `Año válido: 1980–${CURRENT_YEAR + 1}.`
  }
  if (form.engine_cc && (isNaN(Number(form.engine_cc)) || Number(form.engine_cc) <= 0)) {
    errors.engine_cc = 'Cilindraje inválido.'
  }
  return errors
}

export function Motocicletas() {
  const toast = useToast()
  const mountedRef = useRef(true)
  const searchTimerRef = useRef(null)

  // ── List state ───────────────────────────────────────
  const [motorcycles, setMotorcycles] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ── Clients for selector ──────────────────────────────
  const [clients, setClients] = useState([])

  // ── Create modal ──────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // ── Delete modal ──────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteReasonError, setDeleteReasonError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimeout(searchTimerRef.current)
    }
  }, [])

  // Load client list once on mount for the selector
  useEffect(() => {
    clientsApi.getAll({ limit: 200 }).then((res) => {
      if (mountedRef.current) setClients(res.data ?? [])
    }).catch(() => {})
  }, [])

  const loadMotorcycles = useCallback(async (opts = {}) => {
    const { silent = false, targetPage = page, q = search } = opts
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res = await motorcyclesApi.getAll({
        page: targetPage,
        limit: LIMIT,
        ...(q ? { search: q } : {}),
      })
      if (!mountedRef.current) return
      setMotorcycles(res.data ?? [])
      setPagination(res.pagination ?? { page: targetPage, totalPages: 1, total: res.data?.length ?? 0 })
    } catch (err) {
      if (!mountedRef.current) return
      setError(err.message || 'Error al cargar motocicletas.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    loadMotorcycles()
  }, [loadMotorcycles])

  // ── Debounced search ───────────────────────────────────
  function handleSearchChange(e) {
    const value = e.target.value
    setSearch(value)
    setPage(1)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      loadMotorcycles({ targetPage: 1, q: value })
    }, 400)
  }

  // ── Create modal ───────────────────────────────────────
  function openModal() {
    setFormData(EMPTY_FORM)
    setFormErrors({})
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setFormErrors({})
  }

  function handleInputChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    const errs = validate(formData)
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return }
    setSubmitting(true)
    try {
      const payload = {
        client_id: Number(formData.client_id),
        plate: formData.plate.trim().toUpperCase(),
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        year: Number(formData.year),
        ...(formData.engine_cc ? { engine_cc: Number(formData.engine_cc) } : {}),
        ...(formData.color.trim() ? { color: formData.color.trim() } : {}),
        ...(formData.vin.trim() ? { vin: formData.vin.trim() } : {}),
      }
      await motorcyclesApi.create(payload)
      toast.success(`Motocicleta ${payload.plate} registrada exitosamente`)
      closeModal()
      setPage(1)
      await loadMotorcycles({ silent: true, targetPage: 1, q: search })
    } catch (err) {
      toast.error(err.message || 'Error al registrar la motocicleta.')
    } finally {
      if (mountedRef.current) setSubmitting(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────
  function handleDeleteClick(motorcycle) {
    setDeleteTarget(motorcycle)
    setDeleteReason('')
    setDeleteReasonError('')
  }

  function handleCancelDelete() {
    setDeleteTarget(null)
    setDeleteReason('')
    setDeleteReasonError('')
  }

  async function handleConfirmDelete() {
    const reason = deleteReason.trim()
    if (!reason) { setDeleteReasonError('El motivo de eliminación es obligatorio.'); return }
    setDeleting(true)
    try {
      await motorcyclesApi.remove(deleteTarget.id, reason)
      const label = `${deleteTarget.plate} — ${deleteTarget.brand} ${deleteTarget.model}`
      toast.success(`Motocicleta ${label} eliminada exitosamente`)
      setDeleteTarget(null)
      await loadMotorcycles({ silent: true, targetPage: page, q: search })
    } catch (err) {
      toast.error(err.message || 'Error al eliminar la motocicleta.')
    } finally {
      if (mountedRef.current) setDeleting(false)
    }
  }

  // ── Derived ────────────────────────────────────────────
  const inService = motorcycles.filter((m) => m.status === 'En servicio').length

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Módulo administrativo</p>
          <h1>Motocicletas</h1>
          <p>Gestión de motocicletas registradas en el sistema.</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={openModal} disabled={loading}>
          Nueva motocicleta
        </button>
      </div>

      <div className={styles.summaryBar}>
        <span>{loading ? '...' : `${pagination.total} motocicletas registradas`}</span>
        {!loading && <span>{inService} en servicio</span>}
      </div>

      <div className={styles.searchBar}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Buscar por placa o marca..."
          value={search}
          onChange={handleSearchChange}
        />
      </div>

      {/* ── Loading ──────────────────────────────────────── */}
      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} aria-hidden="true" />
          <p>Cargando motocicletas...</p>
        </div>
      ) : error ? (
        /* ── Error ───────────────────────────────────────── */
        <div className={styles.errorState}>
          <p>{error}</p>
          <button className={styles.primaryButton} type="button" onClick={() => loadMotorcycles()}>
            Reintentar
          </button>
        </div>
      ) : (
        /* ── Table ───────────────────────────────────────── */
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Placa</th>
                  <th>Marca</th>
                  <th>Modelo</th>
                  <th>Año</th>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {motorcycles.map((m) => (
                  <tr key={m.id}>
                    <td data-label="Placa">{m.plate}</td>
                    <td data-label="Marca">{m.brand}</td>
                    <td data-label="Modelo">{m.model}</td>
                    <td data-label="Año">{m.year}</td>
                    <td data-label="Cliente">
                      <span className={styles.ownerName}>
                        {m.client_name} {m.client_last_name}
                      </span>
                    </td>
                    <td data-label="Teléfono">
                      <span className={styles.ownerPhone}>{m.client_phone ?? '—'}</span>
                    </td>
                    <td data-label="Estado">
                      <span className={styles.statusBadge}>{m.status}</span>
                    </td>
                    <td data-label="Acciones">
                      <button
                        className={styles.deleteButton}
                        type="button"
                        disabled={deleting && deleteTarget?.id === m.id}
                        onClick={() => handleDeleteClick(m)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {motorcycles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={styles.emptyState}>
                      {search
                        ? `Sin resultados para "${search.trim()}"`
                        : 'No hay motocicletas registradas aún'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ────────────────────────────────── */}
          {pagination.totalPages > 1 ? (
            <div className={styles.pagination}>
              <button
                className={styles.secondaryButton}
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <span>Página {page} de {pagination.totalPages}</span>
              <button
                className={styles.secondaryButton}
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </>
      )}

      {/* ── Create modal ──────────────────────────────────── */}
      {isModalOpen ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            aria-labelledby="motorcycle-modal-title"
            className={styles.modal}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Registro</p>
                <h2 id="motorcycle-modal-title">Nueva motocicleta</h2>
              </div>
              <button
                className={styles.iconButton}
                type="button"
                onClick={closeModal}
                aria-label="Cerrar"
                disabled={submitting}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <form className={styles.form} onSubmit={handleCreate}>
              <label className={`${styles.formField} ${styles.fullWidth}`}>
                Propietario *
                <select name="client_id" value={formData.client_id} onChange={handleInputChange}>
                  <option value="">Seleccionar cliente...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.last_name} — {c.document}
                    </option>
                  ))}
                </select>
                {formErrors.client_id ? <span>{formErrors.client_id}</span> : null}
              </label>

              <label className={styles.formField}>
                Placa *
                <input
                  name="plate"
                  value={formData.plate}
                  onChange={handleInputChange}
                  placeholder="ABC12D"
                  disabled={submitting}
                />
                {formErrors.plate ? <span>{formErrors.plate}</span> : null}
              </label>

              <label className={styles.formField}>
                Marca *
                <input
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  placeholder="Yamaha"
                  disabled={submitting}
                />
                {formErrors.brand ? <span>{formErrors.brand}</span> : null}
              </label>

              <label className={styles.formField}>
                Modelo *
                <input
                  name="model"
                  value={formData.model}
                  onChange={handleInputChange}
                  placeholder="FZ 2.0"
                  disabled={submitting}
                />
                {formErrors.model ? <span>{formErrors.model}</span> : null}
              </label>

              <label className={styles.formField}>
                Año *
                <input
                  inputMode="numeric"
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  placeholder={String(CURRENT_YEAR)}
                  disabled={submitting}
                />
                {formErrors.year ? <span>{formErrors.year}</span> : null}
              </label>

              <label className={styles.formField}>
                Cilindraje (cc)
                <input
                  inputMode="numeric"
                  name="engine_cc"
                  value={formData.engine_cc}
                  onChange={handleInputChange}
                  placeholder="150"
                  disabled={submitting}
                />
                {formErrors.engine_cc ? <span>{formErrors.engine_cc}</span> : null}
              </label>

              <label className={styles.formField}>
                Color
                <input
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  placeholder="Negro"
                  disabled={submitting}
                />
              </label>

              <label className={styles.formField}>
                VIN / Chasis
                <input
                  name="vin"
                  value={formData.vin}
                  onChange={handleInputChange}
                  placeholder="Número de chasis"
                  disabled={submitting}
                />
              </label>

              <div className={styles.formActions}>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button className={styles.primaryButton} type="submit" disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Guardar motocicleta'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {/* ── Delete with reason modal ───────────────────────── */}
      {deleteTarget ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            className={styles.modal}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-moto-title"
            aria-describedby="delete-moto-desc"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={`${styles.eyebrow} ${styles.eyebrowDanger}`}>Acción irreversible</p>
                <h2 id="delete-moto-title">Eliminar motocicleta</h2>
              </div>
              <button
                className={styles.iconButton}
                type="button"
                onClick={handleCancelDelete}
                aria-label="Cerrar"
                disabled={deleting}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <p id="delete-moto-desc" className={styles.deleteDesc}>
              Estás a punto de eliminar{' '}
              <strong>
                &ldquo;{deleteTarget.plate} — {deleteTarget.brand} {deleteTarget.model}&rdquo;
              </strong>
              . Esta acción no se puede deshacer.
            </p>

            <label className={`${styles.formField} ${styles.fullWidth}`}>
              Motivo de eliminación <span className={styles.required}>*</span>
              <textarea
                className={`${styles.textarea} ${deleteReasonError ? styles.textareaError : ''}`}
                rows={4}
                placeholder="Describe el motivo por el que se elimina esta motocicleta..."
                value={deleteReason}
                disabled={deleting}
                onChange={(e) => {
                  setDeleteReason(e.target.value)
                  if (e.target.value.trim()) setDeleteReasonError('')
                }}
              />
              {deleteReasonError ? <span>{deleteReasonError}</span> : null}
            </label>

            <div className={styles.formActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={handleCancelDelete}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className={styles.dangerButton}
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Eliminando...' : 'Confirmar eliminación'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}

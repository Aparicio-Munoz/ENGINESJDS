import { useCallback, useEffect, useRef, useState } from 'react'
import { clientsApi, motorcyclesApi } from '../../../api'
import { Pagination } from '../../../components/Pagination/Pagination'
import { useToast } from '../../../hooks/useToast'
import styles from './Motocicletas.module.css'

const LIMIT = 10
const CURRENT_YEAR = new Date().getFullYear()

const MOTO_STATUS_COLORS = {
  'En servicio':       { bg: '#d1fae5', color: '#065f46' },
  'Lista para entrega':{ bg: '#fef3c7', color: '#d97706' },
  'En reparación':     { bg: '#fee2e2', color: '#dc2626' },
  'Entregada':         { bg: '#f3f4f6', color: '#374151' },
}

const MOTO_STATUSES = [
  {
    key: 'En servicio',
    desc: 'En atención de taller',
    accent: '#065f46',
    bg: '#f0fdf4',
    border: '#6ee7b7',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 0 1-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 0 1 .947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 0 1 2.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 0 1 2.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 0 1 .947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 0 1-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 0 1-2.287-.947ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    key: 'En reparación',
    desc: 'Trabajo activo en curso',
    accent: '#dc2626',
    bg: '#fff5f5',
    border: '#fca5a5',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M19 5.5a4.5 4.5 0 0 1-4.791 4.49c-.873-.055-1.808.128-2.368.8l-6.024 7.23a2.724 2.724 0 1 1-3.837-3.837L9.21 8.16c.672-.56.855-1.495.8-2.368a4.5 4.5 0 0 1 5.873-4.575c.324.105.39.51.15.752L13.34 4.66a.455.455 0 0 0-.11.494 3.01 3.01 0 0 0 1.617 1.617c.17.07.363.02.493-.111l2.692-2.692c.241-.241.647-.174.752.15.14.435.216.9.216 1.382ZM4 17a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    key: 'Lista para entrega',
    desc: 'Lista para el cliente',
    accent: '#d97706',
    bg: '#fffbeb',
    border: '#fcd34d',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M6.5 3c-1.051 0-2.093.04-3.125.117A1.49 1.49 0 0 0 2 4.607V10.5h9V4.606c0-.771-.59-1.43-1.375-1.489A41.568 41.568 0 0 0 6.5 3ZM2 12v2.5A1.5 1.5 0 0 0 3.5 16h.041a3 3 0 0 1 5.918 0h.791a.75.75 0 0 0 .75-.75V12H2Z" />
        <path d="M6.5 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM13.25 5a.75.75 0 0 0-.75.75v8.514a3.001 3.001 0 0 1 4.893 1.44c.37-.275.61-.719.61-1.22v-2.16l-2.038-5.09A.914.914 0 0 0 15.12 6.5H14V5.75A.75.75 0 0 0 13.25 5ZM14 8h.893l1.607 4.013V14H14V8ZM15.5 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      </svg>
    ),
  },
  {
    key: 'Entregada',
    desc: 'Devuelta al propietario',
    accent: '#374151',
    bg: '#f9fafb',
    border: '#d1d5db',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M3.5 2.75a.75.75 0 0 0-1.5 0v14.5a.75.75 0 0 0 1.5 0v-4.392l1.657-.348a6.449 6.449 0 0 1 4.271.572 7.948 7.948 0 0 0 5.965.524l2.078-.64A.75.75 0 0 0 18 12.25v-8.5a.75.75 0 0 0-.904-.734l-2.38.501a7.25 7.25 0 0 1-4.186-.363l-.502-.2a8.75 8.75 0 0 0-5.053-.439l-1.475.31V2.75Z" />
      </svg>
    ),
  },
]

const EMPTY_FORM = {
  client_id: '',
  plate: '',
  brand: '',
  model: '',
  year: '',
  engine_cc: '',
}

function validate(form) {
  const errors = {}
  const plate = form.plate.trim().toUpperCase()
  if (plate && !/^[A-Z]{3}[0-9]{2}[A-Z0-9]$/.test(plate)) errors.plate = 'Placa colombiana: 3 letras + 2 números + 1 letra o número (ej. ABC12D).'
  const year = form.year.trim()
  if (year) {
    const yearNum = Number(year)
    if (!Number.isInteger(yearNum) || yearNum < 1970 || yearNum > CURRENT_YEAR + 1) {
      errors.year = `Año válido: 1970–${CURRENT_YEAR + 1}.`
    }
  }
  if (form.engine_cc && (isNaN(Number(form.engine_cc)) || Number(form.engine_cc) <= 0)) {
    errors.engine_cc = 'Cilindraje inválido.'
  }
  return errors
}

function motoLabel(m) {
  return m?.plate || [m?.brand, m?.model].filter(Boolean).join(' ') || `Moto #${m?.id}`
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

  // ── Create / edit modal ────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null) // null = crear, moto = editar
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [ownerSearch, setOwnerSearch] = useState('')

  // ── Status change modal ───────────────────────────────
  const [statusTarget, setStatusTarget] = useState(null)
  const [statusNew, setStatusNew] = useState('')
  const [statusSubmitting, setStatusSubmitting] = useState(false)

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
    const timer = setTimeout(() => loadMotorcycles(), 0)
    return () => clearTimeout(timer)
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

  // ── Status modal ────────────────────────────────────────
  function openStatusModal(m) {
    setStatusTarget(m)
    setStatusNew(m.status)
  }

  async function handleStatusSubmit() {
    if (!statusTarget || statusNew === statusTarget.status) return
    setStatusSubmitting(true)
    try {
      await motorcyclesApi.update(statusTarget.id, { status: statusNew })
      toast.success(`Estado de ${motoLabel(statusTarget)} cambiado a ${statusNew}`)
      setStatusTarget(null)
      await loadMotorcycles({ silent: true, targetPage: page, q: search })
    } catch (err) {
      toast.error(err.message || 'Error al cambiar el estado.')
    } finally {
      if (mountedRef.current) setStatusSubmitting(false)
    }
  }

  // ── Create / edit modal ─────────────────────────────────
  function openModal() {
    setEditTarget(null)
    setFormData(EMPTY_FORM)
    setFormErrors({})
    setOwnerSearch('')
    setIsModalOpen(true)
  }

  function openEdit(m) {
    setEditTarget(m)
    setFormData({
      client_id: m.client_id ? String(m.client_id) : '',
      plate:     m.plate ?? '',
      brand:     m.brand ?? '',
      model:     m.model ?? '',
      year:      m.year ? String(m.year) : '',
      engine_cc: m.engine_cc ? String(m.engine_cc) : '',
    })
    setFormErrors({})
    setOwnerSearch('')
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditTarget(null)
    setFormErrors({})
    setOwnerSearch('')
  }

  function handleInputChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(formData)
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      toast.error('Revisa los campos marcados antes de guardar.')
      return
    }
    setSubmitting(true)
    try {
      if (editTarget) {
        // En edición se manda el valor actual de cada campo (incluso
        // vacío) — el backend lo normaliza a NULL, permitiendo "borrar"
        // un campo opcional (ej. quitar el propietario o la placa).
        const payload = {
          client_id: formData.client_id ? Number(formData.client_id) : '',
          plate:     formData.plate.trim().toUpperCase(),
          brand:     formData.brand.trim(),
          model:     formData.model.trim(),
          year:      formData.year.trim() ? Number(formData.year) : '',
          engine_cc: formData.engine_cc ? Number(formData.engine_cc) : '',
        }
        const updated = await motorcyclesApi.update(editTarget.id, payload)
        toast.success(`Motocicleta ${motoLabel(updated)} actualizada exitosamente`)
        closeModal()
        await loadMotorcycles({ silent: true, targetPage: page, q: search })
      } else {
        const payload = {
          ...(formData.client_id ? { client_id: Number(formData.client_id) } : {}),
          ...(formData.plate.trim() ? { plate: formData.plate.trim().toUpperCase() } : {}),
          ...(formData.brand.trim() ? { brand: formData.brand.trim() } : {}),
          ...(formData.model.trim() ? { model: formData.model.trim() } : {}),
          ...(formData.year.trim() ? { year: Number(formData.year) } : {}),
          ...(formData.engine_cc ? { engine_cc: Number(formData.engine_cc) } : {}),
        }
        const created = await motorcyclesApi.create(payload)
        toast.success(`Motocicleta ${motoLabel(created)} registrada exitosamente`)
        closeModal()
        setPage(1)
        await loadMotorcycles({ silent: true, targetPage: 1, q: search })
      }
    } catch (err) {
      toast.error(err.message || `Error al ${editTarget ? 'actualizar' : 'registrar'} la motocicleta.`)
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
      toast.success(`Motocicleta ${motoLabel(deleteTarget)} eliminada exitosamente`)
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

  // ── Combobox buscable de propietario (crear moto) ───────
  const selectedOwner = clients.find((c) => String(c.id) === String(formData.client_id))
  const ownerQuery = ownerSearch.toLowerCase().trim()
  const filteredOwners = ownerQuery
    ? clients.filter((c) =>
        `${c.name} ${c.last_name}`.toLowerCase().includes(ownerQuery) ||
        (c.document ?? '').toLowerCase().includes(ownerQuery) ||
        (c.phone ?? '').includes(ownerQuery)
      ).slice(0, 10)
    : []

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
                    <td data-label="Placa">{m.plate || '—'}</td>
                    <td data-label="Marca">{m.brand || '—'}</td>
                    <td data-label="Modelo">{m.model || '—'}</td>
                    <td data-label="Año">{m.year ?? '—'}</td>
                    <td data-label="Cliente">
                      {m.client_name ? (
                        <span className={styles.ownerName}>
                          {m.client_name} {m.client_last_name}
                        </span>
                      ) : (
                        <span className={styles.noOwner}>Sin propietario</span>
                      )}
                    </td>
                    <td data-label="Teléfono">
                      <span className={styles.ownerPhone}>{m.client_phone ?? '—'}</span>
                    </td>
                    <td data-label="Estado">
                      <span
                        className={styles.statusBadge}
                        style={MOTO_STATUS_COLORS[m.status] ? {
                          background: MOTO_STATUS_COLORS[m.status].bg,
                          color: MOTO_STATUS_COLORS[m.status].color,
                        } : undefined}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div className={styles.actionGroup}>
                        <button
                          className={styles.editButton}
                          type="button"
                          onClick={() => openEdit(m)}
                        >
                          Editar
                        </button>
                        <button
                          className={styles.statusButton}
                          type="button"
                          onClick={() => openStatusModal(m)}
                        >
                          Estado
                        </button>
                        <button
                          className={styles.deleteButton}
                          type="button"
                          disabled={deleting && deleteTarget?.id === m.id}
                          onClick={() => handleDeleteClick(m)}
                        >
                          Eliminar
                        </button>
                      </div>
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
          <Pagination
            page={page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={LIMIT}
            onPageChange={setPage}
            disabled={loading}
          />
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
                <p className={styles.eyebrow}>{editTarget ? 'Edición' : 'Registro'}</p>
                <h2 id="motorcycle-modal-title">{editTarget ? 'Editar motocicleta' : 'Nueva motocicleta'}</h2>
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

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={`${styles.formField} ${styles.fullWidth}`}>
                <span className={styles.fieldLabel}>Propietario <span className={styles.optional}>(opcional)</span></span>
                {selectedOwner ? (
                  <div className={styles.partSelected}>
                    <span>
                      {selectedOwner.name} {selectedOwner.last_name}
                      {selectedOwner.document ? ` — ${selectedOwner.document}` : ''}
                    </span>
                    <button
                      type="button"
                      className={styles.partClearBtn}
                      onClick={() => {
                        setFormData((p) => ({ ...p, client_id: '' }))
                        setOwnerSearch('')
                      }}
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div className={styles.partAutocomplete}>
                    <input
                      type="search"
                      className={styles.partSearchInput}
                      placeholder="Escribe nombre, documento o teléfono…"
                      value={ownerSearch}
                      onChange={(e) => setOwnerSearch(e.target.value)}
                      autoComplete="off"
                    />
                    {ownerQuery.length > 0 ? (
                      <ul className={styles.partDropdown}>
                        {filteredOwners.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              className={styles.partDropdownItem}
                              onClick={() => {
                                setFormData((p) => ({ ...p, client_id: String(c.id) }))
                                setOwnerSearch('')
                                setFormErrors((p) => ({ ...p, client_id: undefined }))
                              }}
                            >
                              <strong>{c.name} {c.last_name}</strong>
                              <span className={styles.partMeta}>
                                {[c.document, c.phone].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                              </span>
                            </button>
                          </li>
                        ))}
                        {filteredOwners.length === 0 ? (
                          <li className={styles.partNoResults}>Sin resultados</li>
                        ) : null}
                      </ul>
                    ) : null}
                  </div>
                )}
                {formErrors.client_id ? <span className={styles.fieldError}>{formErrors.client_id}</span> : null}
              </div>

              <label className={styles.formField}>
                Placa
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
                Marca
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
                Modelo
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
                Año
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
                  {submitting ? 'Guardando...' : editTarget ? 'Guardar cambios' : 'Guardar motocicleta'}
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
                &ldquo;{motoLabel(deleteTarget)}&rdquo;
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

      {/* ── Status change modal ────────────────────────────── */}
      {statusTarget ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            className={styles.statusModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-moto-title"
          >
            {/* Header */}
            <div className={styles.statusModalHeader}>
              <div className={styles.statusModalMotoInfo}>
                <span id="status-moto-title" className={styles.statusModalPlate}>
                  {motoLabel(statusTarget)}
                </span>
                <span className={styles.statusModalBrand}>
                  {[statusTarget.brand, statusTarget.model].filter(Boolean).join(' ')}
                  {statusTarget.year ? ` · ${statusTarget.year}` : ''}
                </span>
              </div>
              <button
                className={styles.iconButton}
                type="button"
                onClick={() => setStatusTarget(null)}
                aria-label="Cerrar"
                disabled={statusSubmitting}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <p className={styles.statusModalLabel}>Selecciona el nuevo estado</p>

            {/* Card grid */}
            <div className={styles.statusGrid} role="group" aria-label="Estado de la motocicleta">
              {MOTO_STATUSES.map((s) => {
                const isSelected = statusNew === s.key
                const isCurrent = statusTarget.status === s.key
                return (
                  <label
                    key={s.key}
                    className={`${styles.statusCard} ${isSelected ? styles.statusCardSelected : ''}`}
                    style={isSelected ? {
                      borderColor: s.border,
                      background: s.bg,
                      boxShadow: `0 0 0 3px ${s.border}55, 0 4px 12px ${s.border}30`,
                    } : undefined}
                  >
                    <input
                      type="radio"
                      name="moto-status"
                      value={s.key}
                      checked={isSelected}
                      onChange={() => setStatusNew(s.key)}
                      disabled={statusSubmitting}
                      className={styles.statusCardRadio}
                    />
                    <div
                      className={styles.statusCardIcon}
                      style={{ background: s.bg, color: s.accent, borderColor: s.border }}
                    >
                      {s.icon}
                    </div>
                    <div className={styles.statusCardBody}>
                      <span
                        className={styles.statusCardName}
                        style={isSelected ? { color: s.accent } : undefined}
                      >
                        {s.key}
                      </span>
                      <span className={styles.statusCardDesc}>{s.desc}</span>
                    </div>
                    {isCurrent && !isSelected && (
                      <span className={styles.statusCardCurrent}>Actual</span>
                    )}
                    {isSelected && (
                      <svg
                        className={styles.statusCardCheck}
                        viewBox="0 0 20 20"
                        fill={s.accent}
                        width="18"
                        height="18"
                        aria-hidden="true"
                      >
                        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                      </svg>
                    )}
                  </label>
                )
              })}
            </div>

            {/* Actions */}
            <div className={styles.statusModalActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => setStatusTarget(null)}
                disabled={statusSubmitting}
              >
                Cancelar
              </button>
              <button
                className={styles.primaryButton}
                type="button"
                onClick={handleStatusSubmit}
                disabled={statusSubmitting || statusNew === statusTarget.status}
              >
                {statusSubmitting ? 'Guardando...' : 'Confirmar cambio'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}

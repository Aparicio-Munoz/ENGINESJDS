import { useCallback, useEffect, useRef, useState } from 'react'
import { clientsApi } from '../../../api/clientsApi'
import { ConfirmModal } from '../../../components/ConfirmModal/ConfirmModal'
import { Pagination } from '../../../components/Pagination/Pagination'
import { useToast } from '../../../hooks/useToast'
import styles from './Clientes.module.css'

// ── Constantes ──────────────────────────────────────────────────
const DOCUMENT_TYPES = ['CC', 'CE', 'NIT', 'Pasaporte']

const ITEMS_PER_PAGE = 20

const INITIAL_FORM = {
  name:          '',
  last_name:     '',
  document_type: 'CC',
  document:      '',
  phone:         '',
  email:         '',
  address:       '',
}

function validate(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'El nombre es obligatorio.'
  else if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñüÜ\s]+$/.test(form.name.trim())) errors.name = 'Solo letras y espacios.'
  if (!form.last_name.trim()) errors.last_name = 'El apellido es obligatorio.'
  else if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñüÜ\s]+$/.test(form.last_name.trim())) errors.last_name = 'Solo letras y espacios.'
  if (!form.document_type) errors.document_type = 'Selecciona el tipo de documento.'

  const doc = form.document.trim()
  if (!doc) errors.document = 'El documento es obligatorio.'
  else if (!/^[A-Za-z0-9-]{5,20}$/.test(doc)) errors.document = 'Entre 5 y 20 caracteres alfanuméricos.'

  const phone = form.phone.trim()
  if (!phone) errors.phone = 'El teléfono es obligatorio.'
  else if (!/^\d{7,15}$/.test(phone)) errors.phone = 'Entre 7 y 15 dígitos numéricos.'

  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    errors.email = 'Formato de correo inválido.'

  return errors
}

function extractApiError(err) {
  const data = err?.response?.data
  if (data?.errors?.length) {
    const byField = {}
    for (const e of data.errors) {
      if (e.field && e.message) byField[e.field] = e.message
    }
    if (Object.keys(byField).length) return { fieldErrors: byField }
  }
  return { general: data?.message ?? err?.message ?? 'Error inesperado.' }
}

// ── Componente ──────────────────────────────────────────────────
export function Clientes() {
  const toast = useToast()

  // Lista
  const [clients,    setClients]    = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [page,       setPage]       = useState(1)
  const [search,     setSearch]     = useState('')
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  // Modal creación
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData,    setFormData]    = useState(INITIAL_FORM)
  const [formErrors,  setFormErrors]  = useState({})
  const [submitting,  setSubmitting]  = useState(false)

  // Modal confirmación delete
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleting,     setDeleting]     = useState(false)

  const mountedRef     = useRef(true)
  const searchTimerRef = useRef(null)

  // ── Carga de datos ───────────────────────────────────────────
  const loadClients = useCallback(async (targetPage = 1, searchQuery = '') => {
    setLoading(true)
    setError(null)
    try {
      const res = await clientsApi.getAll({
        page:   targetPage,
        limit:  ITEMS_PER_PAGE,
        search: searchQuery || undefined,
      })
      if (!mountedRef.current) return
      setClients(res.data ?? [])
      setPagination(res.pagination ?? { page: 1, total: 0, totalPages: 1 })
    } catch (err) {
      if (!mountedRef.current) return
      setError(err.message || 'Error cargando los clientes.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    loadClients(1, '')
    return () => { mountedRef.current = false }
  }, [loadClients])

  // ── Búsqueda con debounce (400 ms) ──────────────────────────
  function handleSearchChange(e) {
    const value = e.target.value
    setSearch(value)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setPage(1)
      loadClients(1, value)
    }, 400)
  }

  // ── Paginación ───────────────────────────────────────────────
  function handlePageChange(newPage) {
    setPage(newPage)
    loadClients(newPage, search)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Modal creación ───────────────────────────────────────────
  function openModal() {
    setFormData(INITIAL_FORM)
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

  async function handleSubmitCreate(e) {
    e.preventDefault()
    const errs = validate(formData)
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return }

    setSubmitting(true)
    setFormErrors({})
    try {
      const created = await clientsApi.create({
        name:          formData.name.trim(),
        last_name:     formData.last_name.trim(),
        document_type: formData.document_type,
        document:      formData.document.trim(),
        phone:         formData.phone.trim(),
        email:         formData.email.trim()   || undefined,
        address:       formData.address.trim() || undefined,
      })
      toast.success(`Cliente "${created.name} ${created.last_name}" registrado`)
      closeModal()
      setPage(1)
      loadClients(1, search)
    } catch (err) {
      const parsed = extractApiError(err)
      if (parsed.fieldErrors) {
        setFormErrors(parsed.fieldErrors)
      } else {
        setFormErrors({ _general: parsed.general })
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Eliminar ─────────────────────────────────────────────────
  function requestDelete(client) {
    setDeleteReason('')
    setDeleteTarget({
      id:    client.id,
      label: `${client.name} ${client.last_name}`,
    })
  }

  const [deleteError, setDeleteError] = useState(null)

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    const label = deleteTarget.label
    try {
      await clientsApi.remove(deleteTarget.id, deleteReason)
      toast.success(`Cliente "${label}" eliminado`)
      setDeleteTarget(null)
      const targetPage = clients.length === 1 && page > 1 ? page - 1 : page
      setPage(targetPage)
      loadClients(targetPage, search)
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Error al eliminar.'
      const isConflict = err?.response?.status === 409
      if (isConflict) {
        setDeleteError({ message: msg, clientId: deleteTarget.id })
      } else {
        toast.error(msg)
        setDeleteTarget(null)
      }
    } finally {
      setDeleting(false)
    }
  }

  // ── Texto del resumen ────────────────────────────────────────
  const summaryText = loading
    ? 'Cargando…'
    : search
    ? `${pagination.total} resultado${pagination.total !== 1 ? 's' : ''} para "${search}"`
    : `${pagination.total} cliente${pagination.total !== 1 ? 's' : ''} registrado${pagination.total !== 1 ? 's' : ''}`

  // ── Render ───────────────────────────────────────────────────
  return (
    <section className={styles.page}>

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Módulo administrativo</p>
          <h1>Clientes</h1>
          <p>Gestión de clientes del taller.</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={openModal}>
          Nuevo cliente
        </button>
      </div>

      {/* Resumen */}
      <div className={styles.summaryBar}>
        <span>{summaryText}</span>
      </div>

      {/* Búsqueda */}
      <div className={styles.searchBar}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Buscar por nombre, apellido o documento..."
          value={search}
          onChange={handleSearchChange}
          aria-label="Buscar clientes"
        />
      </div>

      {/* Error */}
      {error ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: '#DC2626', marginBottom: '1rem', fontWeight: 500 }}>{error}</p>
          <button
            type="button"
            onClick={() => loadClients(page, search)}
            style={{ padding: '0.5rem 1.25rem', cursor: 'pointer', borderRadius: '8px', border: '1.5px solid #E2E8F0' }}
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          {/* Tabla */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo Doc.</th>
                  <th>Documento</th>
                  <th>Teléfono</th>
                  <th>Correo</th>
                  <th>Dirección</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className={styles.emptyState}>Cargando clientes…</td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.emptyState}>
                      {search
                        ? `Sin resultados para "${search}"`
                        : 'No hay clientes registrados aún'}
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr key={client.id}>
                      <td data-label="Nombre">
                        <span className={styles.clientName}>
                          {client.name} {client.last_name}
                        </span>
                      </td>
                      <td data-label="Tipo Doc.">{client.document_type}</td>
                      <td data-label="Documento">{client.document}</td>
                      <td data-label="Teléfono">{client.phone || '—'}</td>
                      <td data-label="Correo">{client.email || '—'}</td>
                      <td data-label="Dirección">{client.address || '—'}</td>
                      <td data-label="Acciones">
                        <button
                          className={styles.deleteButton}
                          type="button"
                          onClick={() => requestDelete(client)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={handlePageChange}
            disabled={loading}
          />
        </>
      )}

      {/* Modal creación ──────────────────────────────────────── */}
      {isModalOpen ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            aria-labelledby="client-modal-title"
            className={styles.modal}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Registro</p>
                <h2 id="client-modal-title">Nuevo cliente</h2>
              </div>
              <button className={styles.iconButton} type="button" onClick={closeModal} aria-label="Cerrar">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmitCreate} noValidate>

              {formErrors._general ? (
                <div
                  role="alert"
                  style={{
                    gridColumn: '1 / -1', padding: '0.75rem',
                    background: '#FEE2E2', borderRadius: '8px',
                    color: '#DC2626', fontSize: '0.875rem',
                  }}
                >
                  {formErrors._general}
                </div>
              ) : null}

              <label className={styles.formField}>
                Nombre <span className={styles.required}>*</span>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Carlos"
                  autoFocus
                />
                {formErrors.name ? <span className={styles.fieldError}>{formErrors.name}</span> : <span className={styles.fieldHint}>Solo letras</span>}
              </label>

              <label className={styles.formField}>
                Apellido <span className={styles.required}>*</span>
                <input
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder="Ramírez"
                />
                {formErrors.last_name ? <span className={styles.fieldError}>{formErrors.last_name}</span> : <span className={styles.fieldHint}>Solo letras</span>}
              </label>

              <label className={styles.formField}>
                Tipo de documento <span className={styles.required}>*</span>
                <select
                  name="document_type"
                  value={formData.document_type}
                  onChange={handleInputChange}
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {formErrors.document_type ? <span className={styles.fieldError}>{formErrors.document_type}</span> : null}
              </label>

              <label className={styles.formField}>
                Número de documento <span className={styles.required}>*</span>
                <input
                  inputMode="text"
                  name="document"
                  value={formData.document}
                  onChange={handleInputChange}
                  placeholder="1020304050"
                />
                {formErrors.document ? <span className={styles.fieldError}>{formErrors.document}</span> : <span className={styles.fieldHint}>5–20 caracteres alfanuméricos</span>}
              </label>

              <label className={styles.formField}>
                Teléfono <span className={styles.required}>*</span>
                <input
                  inputMode="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="3001234567"
                />
                {formErrors.phone ? <span className={styles.fieldError}>{formErrors.phone}</span> : <span className={styles.fieldHint}>7–15 dígitos</span>}
              </label>

              <label className={styles.formField}>
                Correo electrónico <span className={styles.optional}>(opcional)</span>
                <input
                  inputMode="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="correo@email.com"
                />
                {formErrors.email ? <span className={styles.fieldError}>{formErrors.email}</span> : null}
              </label>

              <label className={`${styles.formField} ${styles.fullWidth}`}>
                Dirección <span className={styles.optional}>(opcional)</span>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Cra 5 # 12-34, Ciudad"
                />
                {formErrors.address ? <span className={styles.fieldError}>{formErrors.address}</span> : null}
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
                <button
                  className={styles.primaryButton}
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? 'Guardando…' : 'Guardar cliente'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {/* Modal confirmación delete */}
      {deleteTarget && !deleteError ? (
        <ConfirmModal
          isOpen
          entityLabel={deleteTarget.label}
          reason={deleteReason}
          onReasonChange={setDeleteReason}
          onConfirm={handleConfirmDelete}
          onCancel={() => !deleting && setDeleteTarget(null)}
        />
      ) : null}

      {/* Error de conflicto (órdenes activas) */}
      {deleteError ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section className={styles.modal} role="alertdialog" aria-modal="true">
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrowDanger}>No se puede eliminar</p>
                <h2>{deleteTarget?.label}</h2>
              </div>
              <button className={styles.iconButton} type="button" onClick={() => { setDeleteError(null); setDeleteTarget(null) }} aria-label="Cerrar">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
              </button>
            </div>
            <div className={styles.conflictBody}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="40" height="40" className={styles.conflictIcon}>
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              <p className={styles.conflictText}>{deleteError.message}</p>
              <p className={styles.conflictHint}>Cierra o entrega las órdenes pendientes antes de eliminar este cliente.</p>
            </div>
            <div className={styles.conflictActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => { setDeleteError(null); setDeleteTarget(null) }}
              >
                Cerrar
              </button>
              <a
                className={styles.primaryButton}
                href={`/admin/ordenes?client_id=${deleteError.clientId}`}
                style={{ textDecoration: 'none', textAlign: 'center' }}
              >
                Ver órdenes del cliente
              </a>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}

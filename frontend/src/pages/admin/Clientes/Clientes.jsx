import { useCallback, useEffect, useRef, useState } from 'react'
import { clientsApi } from '../../../api/clientsApi'
import { ConfirmModal } from '../../../components/ConfirmModal/ConfirmModal'
import { useToast } from '../../../hooks/useToast'
import styles from './Clientes.module.css'

// ── Constantes ──────────────────────────────────────────────────
const DOCUMENT_TYPES = ['CC', 'NIT', 'CE', 'PP', 'Otro']

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

// ── Validación client-side (campos básicos) ──────────────────────
function validate(form) {
  const errors = {}
  if (!form.name.trim())      errors.name      = 'El nombre es obligatorio.'
  if (!form.last_name.trim()) errors.last_name = 'El apellido es obligatorio.'
  if (!form.document_type)    errors.document_type = 'Selecciona el tipo de documento.'

  const doc = form.document.trim()
  if (!doc)                          errors.document = 'El documento es obligatorio.'
  else if (!/^[A-Za-z0-9-]{5,15}$/.test(doc)) errors.document = 'Entre 5 y 15 caracteres alfanuméricos.'

  if (form.phone.trim() && !/^\d{7,15}$/.test(form.phone.trim()))
    errors.phone = 'Teléfono: entre 7 y 15 dígitos.'

  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    errors.email = 'Ingresa un correo válido.'

  return errors
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
        phone:         formData.phone.trim()   || undefined,
        email:         formData.email.trim()   || undefined,
        address:       formData.address.trim() || undefined,
      })
      toast.success(`Cliente "${created.name} ${created.last_name}" registrado`)
      closeModal()
      // Ir a página 1 para ver el nuevo cliente
      setPage(1)
      loadClients(1, search)
    } catch (err) {
      setFormErrors({ _general: err.message || 'Error al guardar el cliente.' })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Eliminar ─────────────────────────────────────────────────
  function requestDelete(client) {
    setDeleteTarget({
      id:    client.id,
      label: `${client.name} ${client.last_name}`,
    })
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const label = deleteTarget.label
    try {
      await clientsApi.remove(deleteTarget.id)
      toast.success(`Cliente "${label}" eliminado`)
      setDeleteTarget(null)
      // Si era el último de la página, retroceder
      const targetPage = clients.length === 1 && page > 1 ? page - 1 : page
      setPage(targetPage)
      loadClients(targetPage, search)
    } catch (err) {
      toast.error(err.message || 'Error al eliminar el cliente.')
      setDeleteTarget(null)
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

          {/* Paginación */}
          {pagination.totalPages > 1 ? (
            <nav
              aria-label="Paginación de clientes"
              style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                gap: '1rem', padding: '1rem 0', borderTop: '1px solid #E2E8F0',
              }}
            >
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => handlePageChange(page - 1)}
                style={{
                  padding: '0.375rem 0.875rem', cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  border: '1px solid #E2E8F0', borderRadius: '6px',
                  background: page <= 1 ? '#F8FAFC' : '#fff', color: '#374151',
                  opacity: page <= 1 ? 0.5 : 1,
                }}
              >
                ← Anterior
              </button>
              <span style={{ color: '#64748B', fontSize: '0.875rem', minWidth: '8rem', textAlign: 'center' }}>
                Página {page} de {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= pagination.totalPages || loading}
                onClick={() => handlePageChange(page + 1)}
                style={{
                  padding: '0.375rem 0.875rem',
                  cursor: page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                  border: '1px solid #E2E8F0', borderRadius: '6px',
                  background: page >= pagination.totalPages ? '#F8FAFC' : '#fff', color: '#374151',
                  opacity: page >= pagination.totalPages ? 0.5 : 1,
                }}
              >
                Siguiente →
              </button>
            </nav>
          ) : null}
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
                Nombre
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Carlos"
                  autoFocus
                />
                {formErrors.name ? <span>{formErrors.name}</span> : null}
              </label>

              <label className={styles.formField}>
                Apellido
                <input
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder="Ramírez"
                />
                {formErrors.last_name ? <span>{formErrors.last_name}</span> : null}
              </label>

              <label className={styles.formField}>
                Tipo de documento
                <select
                  name="document_type"
                  value={formData.document_type}
                  onChange={handleInputChange}
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {formErrors.document_type ? <span>{formErrors.document_type}</span> : null}
              </label>

              <label className={styles.formField}>
                Número de documento
                <input
                  inputMode="numeric"
                  name="document"
                  value={formData.document}
                  onChange={handleInputChange}
                  placeholder="1020304050"
                />
                {formErrors.document ? <span>{formErrors.document}</span> : null}
              </label>

              <label className={styles.formField}>
                Teléfono <span style={{ fontWeight: 400, color: '#94A3B8' }}>(opcional)</span>
                <input
                  inputMode="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="3001234567"
                />
                {formErrors.phone ? <span>{formErrors.phone}</span> : null}
              </label>

              <label className={styles.formField}>
                Correo electrónico <span style={{ fontWeight: 400, color: '#94A3B8' }}>(opcional)</span>
                <input
                  inputMode="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="correo@email.com"
                />
                {formErrors.email ? <span>{formErrors.email}</span> : null}
              </label>

              <label className={`${styles.formField} ${styles.fullWidth}`}>
                Dirección <span style={{ fontWeight: 400, color: '#94A3B8' }}>(opcional)</span>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Cra 5 # 12-34, Ciudad"
                />
                {formErrors.address ? <span>{formErrors.address}</span> : null}
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
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        entityLabel={deleteTarget?.label ?? ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </section>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { clientsApi } from '../../../api/clientsApi'
import { ConfirmModal } from '../../../components/ConfirmModal/ConfirmModal'
import { Pagination } from '../../../components/Pagination/Pagination'
import { useToast } from '../../../hooks/useToast'
import styles from './Clientes.module.css'

// ── Constantes ──────────────────────────────────────────────────
const DOCUMENT_TYPES = ['CC', 'CE', 'NIT', 'Pasaporte']

const ITEMS_PER_PAGE = 10

const INITIAL_FORM = {
  name:          '',
  last_name:     '',
  document_type: 'CC',
  document:      '',
  phone:         '',
}

function validate(form) {
  const errors = {}
  const name = form.name.trim()
  if (name && !/^[A-Za-zÁÉÍÓÚáéíóúÑñüÜ\s]+$/.test(name)) errors.name = 'Solo letras y espacios.'

  const lastName = form.last_name.trim()
  if (lastName && !/^[A-Za-zÁÉÍÓÚáéíóúÑñüÜ\s]+$/.test(lastName)) errors.last_name = 'Solo letras y espacios.'

  const doc = form.document.trim()
  if (doc && !/^[A-Za-z0-9-]{5,20}$/.test(doc)) errors.document = 'Entre 5 y 20 caracteres alfanuméricos.'

  const phone = form.phone.trim()
  if (phone && !/^\d{7,15}$/.test(phone)) errors.phone = 'Entre 7 y 15 dígitos numéricos.'

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

  // Modal creación / edición
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editTarget,  setEditTarget]  = useState(null) // null = crear, cliente = editar
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
    const timer = setTimeout(() => loadClients(1, ''), 0)
    return () => { mountedRef.current = false; clearTimeout(timer) }
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

  // ── Modal creación / edición ─────────────────────────────────
  function openModal() {
    setEditTarget(null)
    setFormData(INITIAL_FORM)
    setFormErrors({})
    setIsModalOpen(true)
  }

  function openEdit(client) {
    setEditTarget(client)
    setFormData({
      name:          client.name ?? '',
      last_name:     client.last_name ?? '',
      document_type: client.document_type || 'CC',
      document:      client.document ?? '',
      phone:         client.phone ?? '',
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditTarget(null)
    setFormErrors({})
  }

  function handleInputChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(formData)
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return }

    setSubmitting(true)
    setFormErrors({})
    const payload = {
      name:          formData.name.trim(),
      last_name:     formData.last_name.trim(),
      document_type: formData.document_type,
      document:      formData.document.trim(),
      phone:         formData.phone.trim(),
    }
    try {
      if (editTarget) {
        const updated = await clientsApi.update(editTarget.id, payload)
        const updatedLabel = [updated.name, updated.last_name].filter(Boolean).join(' ') || `#${updated.id}`
        toast.success(`Cliente "${updatedLabel}" actualizado`)
        closeModal()
        loadClients(page, search)
      } else {
        const created = await clientsApi.create(payload)
        const createdLabel = [created.name, created.last_name].filter(Boolean).join(' ') || `#${created.id}`
        toast.success(`Cliente "${createdLabel}" registrado`)
        closeModal()
        setPage(1)
        loadClients(1, search)
      }
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
      label: [client.name, client.last_name].filter(Boolean).join(' ') || `Cliente #${client.id}`,
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
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className={styles.emptyState}>Cargando clientes…</td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.emptyState}>
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
                          {[client.name, client.last_name].filter(Boolean).join(' ') || '—'}
                        </span>
                      </td>
                      <td data-label="Tipo Doc.">{client.document_type || '—'}</td>
                      <td data-label="Documento">{client.document || '—'}</td>
                      <td data-label="Teléfono">{client.phone || '—'}</td>
                      <td data-label="Acciones">
                        <div className={styles.actionsCell}>
                          <button
                            className={styles.editButton}
                            type="button"
                            onClick={() => openEdit(client)}
                          >
                            Editar
                          </button>
                          <button
                            className={styles.deleteButton}
                            type="button"
                            onClick={() => requestDelete(client)}
                          >
                            Eliminar
                          </button>
                        </div>
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
            limit={ITEMS_PER_PAGE}
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
                <p className={styles.eyebrow}>{editTarget ? 'Edición' : 'Registro'}</p>
                <h2 id="client-modal-title">{editTarget ? 'Editar cliente' : 'Nuevo cliente'}</h2>
              </div>
              <button className={styles.iconButton} type="button" onClick={closeModal} aria-label="Cerrar">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>

              {formErrors._general ? (
                <div role="alert" className={styles.formAlert}>
                  {formErrors._general}
                </div>
              ) : null}

              <label className={styles.formField}>
                <span>Nombre</span>
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
                <span>Apellido</span>
                <input
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder="Ramírez"
                />
                {formErrors.last_name ? <span className={styles.fieldError}>{formErrors.last_name}</span> : <span className={styles.fieldHint}>Solo letras</span>}
              </label>

              <label className={styles.formField}>
                <span>Tipo de documento</span>
                <select
                  name="document_type"
                  value={formData.document_type}
                  onChange={handleInputChange}
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>

              <label className={styles.formField}>
                <span>Número de documento</span>
                <input
                  inputMode="text"
                  name="document"
                  value={formData.document}
                  onChange={handleInputChange}
                  placeholder="1020304050"
                />
                {formErrors.document ? <span className={styles.fieldError}>{formErrors.document}</span> : <span className={styles.fieldHint}>5–20 caracteres alfanuméricos</span>}
              </label>

              <label className={`${styles.formField} ${styles.fullWidth}`}>
                <span>Teléfono</span>
                <input
                  inputMode="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="3001234567"
                />
                {formErrors.phone ? <span className={styles.fieldError}>{formErrors.phone}</span> : <span className={styles.fieldHint}>7–15 dígitos</span>}
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
                  {submitting ? 'Guardando…' : editTarget ? 'Guardar cambios' : 'Guardar cliente'}
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

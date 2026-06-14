import { useCallback, useEffect, useRef, useState } from 'react'
import { usersApi } from '../../../api'
import { useToast } from '../../../hooks/useToast'
import styles from './Usuarios.module.css'

// Roles válidos en el backend (roles.name en la BD)
const ROLES = ['Administrador', 'Técnico', 'Recepcionista']
const STATUSES = ['Activo', 'Inactivo']

const EMPTY_FORM = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'Administrador',
  status: 'Activo',
}

function validate(form) {
  const errors = {}
  const username = form.username.trim()

  if (!username) errors.username = 'El usuario es obligatorio.'
  else if (username.length < 3 || username.length > 50) errors.username = 'Entre 3 y 50 caracteres.'

  if (!form.email.trim()) errors.email = 'El correo es obligatorio.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Correo inválido.'

  if (!form.password) errors.password = 'La contraseña es obligatoria.'
  else if (form.password.length < 6) errors.password = 'Mínimo 6 caracteres.'

  if (!form.confirmPassword) errors.confirmPassword = 'Confirma la contraseña.'
  else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Las contraseñas no coinciden.'

  if (!form.role) errors.role = 'El rol es obligatorio.'

  return errors
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: '2-digit' })
}

function formatDatetime(iso) {
  if (!iso) return 'Nunca'
  return new Date(iso).toLocaleString('es-CO', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export function Usuarios() {
  const toast = useToast()
  const mountedRef = useRef(true)
  const searchTimerRef = useRef(null)

  // ── List state ────────────────────────────────────────
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ── Filters ───────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

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

  // ── Load users ─────────────────────────────────────────
  const loadUsers = useCallback(async (opts = {}) => {
    const { silent = false } = opts
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res = await usersApi.getAll({
        ...(searchApplied ? { search: searchApplied } : {}),
        ...(filterRole ? { role: filterRole } : {}),
        ...(filterStatus ? { status: filterStatus } : {}),
      })
      if (!mountedRef.current) return
      setUsers(res.data ?? [])
    } catch (err) {
      if (!mountedRef.current) return
      setError(err.message || 'Error al cargar usuarios.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [searchApplied, filterRole, filterStatus])

  useEffect(() => { loadUsers() }, [loadUsers])

  // ── Debounced search ───────────────────────────────────
  function handleSearchChange(e) {
    const value = e.target.value
    setSearchInput(value)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setSearchApplied(value)
    }, 400)
  }

  function handleFilterChange(setter) {
    return (e) => setter(e.target.value)
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
      await usersApi.create({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        status: formData.status,
      })
      toast.success(`Usuario "${formData.username.trim()}" creado exitosamente`)
      closeModal()
      await loadUsers({ silent: true })
    } catch (err) {
      toast.error(err.message || 'Error al crear el usuario.')
    } finally {
      if (mountedRef.current) setSubmitting(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────
  function handleDeleteClick(user) {
    setDeleteTarget(user)
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
      await usersApi.remove(deleteTarget.id, reason)
      toast.success(`Usuario "${deleteTarget.username}" eliminado exitosamente`)
      setDeleteTarget(null)
      await loadUsers({ silent: true })
    } catch (err) {
      toast.error(err.message || 'Error al eliminar el usuario.')
    } finally {
      if (mountedRef.current) setDeleting(false)
    }
  }

  // ── Derived ────────────────────────────────────────────
  const activeCount = users.filter((u) => u.status === 'Activo').length
  const hasFilters = searchInput || filterRole || filterStatus

  // ── Render ─────────────────────────────────────────────
  return (
    <section className={styles.page}>
      {/* ── Header ──────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Módulo administrativo</p>
          <h1>Usuarios</h1>
          <p>Gestión de cuentas de acceso al sistema.</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={openModal} disabled={loading}>
          Nuevo usuario
        </button>
      </div>

      {/* ── Summary bar ─────────────────────────────────── */}
      <div className={styles.summaryBar}>
        <span>{loading ? '...' : `${users.length} usuarios registrados`}</span>
        <span>{activeCount} activos</span>
      </div>

      {/* ── Filter bar ──────────────────────────────────── */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
            </svg>
          </span>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Buscar por usuario o correo..."
            value={searchInput}
            onChange={handleSearchChange}
            aria-label="Buscar usuario"
          />
        </div>

        <select
          className={styles.filterSelect}
          value={filterRole}
          onChange={handleFilterChange(setFilterRole)}
          aria-label="Filtrar por rol"
        >
          <option value="">Todos los roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <select
          className={styles.filterSelect}
          value={filterStatus}
          onChange={handleFilterChange(setFilterStatus)}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* ── Loading ──────────────────────────────────────── */}
      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} aria-hidden="true" />
          <p>Cargando usuarios...</p>
        </div>
      ) : error ? (
        /* ── Error ───────────────────────────────────────── */
        <div className={styles.errorState}>
          <p>{error}</p>
          <button className={styles.primaryButton} type="button" onClick={() => loadUsers()}>
            Reintentar
          </button>
        </div>
      ) : (
        /* ── Table ───────────────────────────────────────── */
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Último acceso</th>
                <th>Fecha creación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td data-label="Usuario">
                    <span className={styles.username}>{u.username}</span>
                  </td>
                  <td data-label="Correo">{u.email}</td>
                  <td data-label="Rol">
                    <span className={styles.roleBadge} data-role={u.role}>{u.role}</span>
                  </td>
                  <td data-label="Estado">
                    <span className={styles.statusBadge} data-status={u.status}>{u.status}</span>
                  </td>
                  <td data-label="Último acceso">
                    <span className={styles.dateCell}>{formatDatetime(u.last_login)}</span>
                  </td>
                  <td data-label="Fecha creación">
                    <span className={styles.dateCell}>{formatDate(u.created_at)}</span>
                  </td>
                  <td data-label="Acciones">
                    <button
                      className={styles.deleteButton}
                      type="button"
                      disabled={deleting && deleteTarget?.id === u.id}
                      onClick={() => handleDeleteClick(u)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyState}>
                    {hasFilters
                      ? 'Sin resultados para los filtros aplicados.'
                      : 'No hay usuarios registrados aún.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create modal ──────────────────────────────────── */}
      {isModalOpen ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            aria-labelledby="user-modal-title"
            className={styles.modal}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Registro</p>
                <h2 id="user-modal-title">Nuevo usuario</h2>
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
              <label className={styles.formField}>
                Usuario *
                <input
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="nombre_usuario"
                  autoComplete="off"
                  disabled={submitting}
                />
                {formErrors.username ? <span>{formErrors.username}</span> : null}
              </label>

              <label className={styles.formField}>
                Correo electrónico *
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="usuario@enginesjds.com"
                  autoComplete="off"
                  disabled={submitting}
                />
                {formErrors.email ? <span>{formErrors.email}</span> : null}
              </label>

              <label className={styles.formField}>
                Contraseña *
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={submitting}
                />
                {formErrors.password
                  ? <span>{formErrors.password}</span>
                  : <span className={styles.fieldHint}>Mínimo 6 caracteres</span>}
              </label>

              <label className={styles.formField}>
                Confirmar contraseña *
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={submitting}
                />
                {formErrors.confirmPassword ? <span>{formErrors.confirmPassword}</span> : null}
              </label>

              <label className={styles.formField}>
                Rol *
                <select name="role" value={formData.role} onChange={handleInputChange} disabled={submitting}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {formErrors.role ? <span>{formErrors.role}</span> : null}
              </label>

              <label className={styles.formField}>
                Estado
                <select name="status" value={formData.status} onChange={handleInputChange} disabled={submitting}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
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
                  {submitting ? 'Guardando...' : 'Guardar usuario'}
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
            aria-labelledby="delete-user-title"
            aria-describedby="delete-user-desc"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={`${styles.eyebrow} ${styles.eyebrowDanger}`}>Acción irreversible</p>
                <h2 id="delete-user-title">Eliminar usuario</h2>
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

            <p id="delete-user-desc" className={styles.deleteDesc}>
              Estás a punto de eliminar al usuario{' '}
              <strong>&ldquo;{deleteTarget.username}&rdquo;</strong>{' '}
              ({deleteTarget.email}). Esta acción no se puede deshacer.
            </p>

            <label className={`${styles.formField} ${styles.fullWidth}`}>
              Motivo de eliminación <span className={styles.required}>*</span>
              <textarea
                className={`${styles.textarea} ${deleteReasonError ? styles.textareaError : ''}`}
                rows={4}
                placeholder="Describe el motivo por el que se elimina este usuario..."
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

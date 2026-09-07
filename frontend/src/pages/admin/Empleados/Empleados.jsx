import { useCallback, useEffect, useRef, useState } from 'react'
import { employeesApi, reportsApi } from '../../../api'
import { useToast } from '../../../hooks/useToast'
import styles from './Empleados.module.css'

const LIMIT = 20
const DOCUMENT_TYPES = ['CC', 'CE', 'Pasaporte']
const STATUSES = ['Activo', 'Inactivo', 'Vacaciones', 'Incapacidad', 'Suspendido', 'Retirado']

const STATUS_COLORS = {
  Activo:      { bg: '#d1fae5', color: '#065f46' },
  Inactivo:    { bg: '#f3f4f6', color: '#374151' },
  Vacaciones:  { bg: '#dbeafe', color: '#1d4ed8' },
  Incapacidad: { bg: '#fef3c7', color: '#d97706' },
  Suspendido:  { bg: '#fee2e2', color: '#dc2626' },
  Retirado:    { bg: '#e5e7eb', color: '#6b7280' },
}

function todayISO() {
  // Fecha local (no UTC) — toISOString() se adelanta un día cuando la
  // zona horaria local va detrás de UTC, desalineando el rango del
  // modal de Ganancias con el "hoy" real del servidor.
  return new Date().toLocaleDateString('en-CA')
}

function emptyForm() {
  return {
    document_type: 'CC',
    document: '',
    name: '',
    last_name: '',
    phone: '',
    email: '',
    specialty: '',
    daily_rate: '',
    commission_percent: '',
    status: 'Activo',
    hire_date: todayISO(),
  }
}

function validate(form) {
  const errors = {}
  const doc = form.document.trim()
  if (!doc) errors.document = 'El documento es obligatorio.'
  else if (doc.length < 5 || doc.length > 20) errors.document = 'Entre 5 y 20 caracteres.'

  if (!form.name.trim()) errors.name = 'El nombre es obligatorio.'
  if (!form.last_name.trim()) errors.last_name = 'El apellido es obligatorio.'
  if (!form.phone.trim()) errors.phone = 'El teléfono es obligatorio.'
  if (!form.specialty.trim()) errors.specialty = 'La especialidad es obligatoria.'
  if (!form.hire_date) errors.hire_date = 'La fecha de contratación es obligatoria.'

  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Correo electrónico inválido.'
  }
  if (form.daily_rate && (isNaN(Number(form.daily_rate)) || Number(form.daily_rate) < 0)) {
    errors.daily_rate = 'Tarifa inválida.'
  }
  if (form.commission_percent && (isNaN(Number(form.commission_percent)) || Number(form.commission_percent) < 0 || Number(form.commission_percent) > 100)) {
    errors.commission_percent = 'La comisión debe estar entre 0 y 100.'
  }
  return errors
}

function fmtCOP(n) {
  return `$${Math.round(Number(n)).toLocaleString('es-CO')}`
}

function initials(fullName = '') {
  return fullName.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function EarningsTab({ label, value }) {
  return (
    <div className={styles.earningTab}>
      <span className={styles.earningValue}>{value}</span>
      <span className={styles.earningLabel}>{label}</span>
    </div>
  )
}

export function Empleados() {
  const toast = useToast()
  const mountedRef = useRef(true)
  const searchTimerRef = useRef(null)

  // ── List state ────────────────────────────────────────
  const [employees, setEmployees] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)

  // ── Filters ───────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [filterSpecialty, setFilterSpecialty] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [specialties, setSpecialties] = useState([])

  // ── Performance stats ─────────────────────────────────
  const [stats, setStats] = useState([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [activeStatTab, setActiveStatTab] = useState('ordenes')

  // ── Create modal ──────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // ── Delete modal ──────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteReasonError, setDeleteReasonError] = useState('')
  const [deleting, setDeleting] = useState(false)

  // ── Status change modal ───────────────────────────────
  const [statusTarget, setStatusTarget] = useState(null)
  const [statusNew, setStatusNew] = useState('')
  const [statusSubmitting, setStatusSubmitting] = useState(false)

  // ── Earnings modal ────────────────────────────────────
  const [earningsTarget, setEarningsTarget] = useState(null)
  const [earningsFrom, setEarningsFrom] = useState(todayISO())
  const [earningsTo, setEarningsTo] = useState(todayISO())
  const [earningsData, setEarningsData] = useState(null)
  const [earningsLoading, setEarningsLoading] = useState(false)
  const [commissionInput, setCommissionInput] = useState('')
  const [commissionSaving, setCommissionSaving] = useState(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimeout(searchTimerRef.current)
    }
  }, [])

  // Load specialties once for the filter dropdown
  useEffect(() => {
    employeesApi.getSpecialties()
      .then((data) => { if (mountedRef.current) setSpecialties(data ?? []) })
      .catch(() => {})
  }, [])

  // Load performance stats (refreshed after mutations)
  const loadStats = useCallback(() => {
    setStatsLoading(true)
    reportsApi.getEmployeeStats()
      .then((data) => {
        if (!mountedRef.current) return
        setStats(Array.isArray(data) ? data : [])
      })
      .catch(() => { if (mountedRef.current) setStats([]) })
      .finally(() => { if (mountedRef.current) setStatsLoading(false) })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => loadStats(), 0)
    return () => clearTimeout(timer)
  }, [loadStats])

  // Load employees (re-runs when page or applied filters change)
  const loadEmployees = useCallback(async (opts = {}) => {
    const { silent = false, targetPage = page } = opts
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res = await employeesApi.getAll({
        page: targetPage,
        limit: LIMIT,
        ...(searchApplied ? { search: searchApplied } : {}),
        ...(filterSpecialty ? { specialty: filterSpecialty } : {}),
        ...(filterStatus ? { status: filterStatus } : {}),
      })
      if (!mountedRef.current) return
      setEmployees(res.data ?? [])
      setPagination(res.pagination ?? { page: targetPage, totalPages: 1, total: res.data?.length ?? 0 })
    } catch (err) {
      if (!mountedRef.current) return
      setError(err.message || 'Error al cargar empleados.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [page, searchApplied, filterSpecialty, filterStatus])

  useEffect(() => {
    const timer = setTimeout(() => loadEmployees(), 0)
    return () => clearTimeout(timer)
  }, [loadEmployees])

  // ── Debounced search ───────────────────────────────────
  function handleSearchChange(e) {
    const value = e.target.value
    setSearchInput(value)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setPage(1)
      setSearchApplied(value)
    }, 400)
  }

  function handleFilterChange(setter) {
    return (e) => { setter(e.target.value); setPage(1) }
  }

  // ── Create modal ───────────────────────────────────────
  function openModal() {
    setFormData(emptyForm())
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
      await employeesApi.create({
        document_type: formData.document_type,
        document: formData.document.trim(),
        name: formData.name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim(),
        ...(formData.email.trim() ? { email: formData.email.trim() } : {}),
        specialty: formData.specialty.trim(),
        ...(formData.daily_rate ? { daily_rate: Number(formData.daily_rate) } : {}),
        ...(formData.commission_percent ? { commission_percent: Number(formData.commission_percent) } : {}),
        status: formData.status,
        hire_date: formData.hire_date,
      })
      toast.success(`Empleado ${formData.name.trim()} ${formData.last_name.trim()} registrado exitosamente`)
      closeModal()
      await loadEmployees({ silent: true, targetPage: 1 })
      setPage(1)
      loadStats()
    } catch (err) {
      toast.error(err.message || 'Error al registrar el empleado.')
    } finally {
      if (mountedRef.current) setSubmitting(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────
  function handleDeleteClick(emp) {
    setDeleteTarget(emp)
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
      await employeesApi.remove(deleteTarget.id, reason)
      toast.success(`Empleado ${deleteTarget.name} ${deleteTarget.last_name} eliminado exitosamente`)
      setDeleteTarget(null)
      await loadEmployees({ silent: true, targetPage: page })
      loadStats()
    } catch (err) {
      toast.error(err.message || 'Error al eliminar el empleado.')
    } finally {
      if (mountedRef.current) setDeleting(false)
    }
  }

  // ── Earnings handlers ──────────────────────────────────
  const loadEarnings = useCallback(async (empId, from, to) => {
    setEarningsLoading(true)
    try {
      const data = await employeesApi.getEarnings(empId, { from, to })
      if (!mountedRef.current) return
      setEarningsData(data)
    } catch (err) {
      if (!mountedRef.current) return
      toast.error(err.message || 'Error al calcular las ganancias.')
    } finally {
      if (mountedRef.current) setEarningsLoading(false)
    }
  }, [toast])

  function openEarningsModal(emp) {
    const today = todayISO()
    setEarningsTarget(emp)
    setEarningsFrom(today)
    setEarningsTo(today)
    setEarningsData(null)
    setCommissionInput(String(Number(emp.commission_percent ?? 0)))
    loadEarnings(emp.id, today, today)
  }

  function closeEarningsModal() {
    setEarningsTarget(null)
    setEarningsData(null)
  }

  function handleEarningsRange(from, to) {
    setEarningsFrom(from)
    setEarningsTo(to)
    if (from && to && from <= to) {
      loadEarnings(earningsTarget.id, from, to)
    }
  }

  async function handleSaveCommission() {
    const pct = Number(commissionInput)
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast.error('La comisión debe ser un número entre 0 y 100.')
      return
    }
    setCommissionSaving(true)
    try {
      await employeesApi.update(earningsTarget.id, { commission_percent: pct })
      if (!mountedRef.current) return
      toast.success(`Comisión de ${earningsTarget.name} actualizada a ${pct}%`)
      setEarningsTarget((prev) => prev ? { ...prev, commission_percent: pct } : prev)
      await loadEarnings(earningsTarget.id, earningsFrom, earningsTo)
      loadEmployees({ silent: true, targetPage: page })
    } catch (err) {
      toast.error(err.message || 'Error al guardar la comisión.')
    } finally {
      if (mountedRef.current) setCommissionSaving(false)
    }
  }

  // ── Status change handlers ─────────────────────────────
  function openStatusModal(emp) {
    setStatusTarget(emp)
    setStatusNew(emp.status)
  }

  async function handleStatusSubmit(e) {
    e.preventDefault()
    if (!statusTarget || statusNew === statusTarget.status) {
      setStatusTarget(null)
      return
    }
    setStatusSubmitting(true)
    try {
      await employeesApi.update(statusTarget.id, { status: statusNew })
      toast.success(`Estado de ${statusTarget.name} ${statusTarget.last_name} cambiado a ${statusNew}`)
      setStatusTarget(null)
      await loadEmployees({ silent: true, targetPage: page })
    } catch (err) {
      toast.error(err.message || 'Error al cambiar el estado.')
    } finally {
      if (mountedRef.current) setStatusSubmitting(false)
    }
  }

  // ── Derived ────────────────────────────────────────────
  const activeCount = employees.filter((e) => e.status === 'Activo').length
  const topEmployee = stats[0] ?? null
  const hasFilters = searchInput || filterSpecialty || filterStatus

  // ── Render ─────────────────────────────────────────────
  return (
    <section className={styles.page}>
      {/* ── Header ──────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Módulo administrativo</p>
          <h1>Empleados</h1>
          <p>Gestión del personal técnico y administrativo del taller.</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={openModal} disabled={loading}>
          Nuevo empleado
        </button>
      </div>

      {/* ── Summary bar ─────────────────────────────────── */}
      <div className={styles.summaryBar}>
        <span>{loading ? '...' : `${pagination.total} empleados registrados`}</span>
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
            placeholder="Buscar por nombre, documento, especialidad..."
            value={searchInput}
            onChange={handleSearchChange}
            aria-label="Buscar empleado"
          />
        </div>

        <select
          className={styles.filterSelect}
          value={filterSpecialty}
          onChange={handleFilterChange(setFilterSpecialty)}
          aria-label="Filtrar por especialidad"
        >
          <option value="">Todas las especialidades</option>
          {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
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
          <p>Cargando empleados...</p>
        </div>
      ) : error ? (
        /* ── Error ───────────────────────────────────────── */
        <div className={styles.errorState}>
          <p>{error}</p>
          <button className={styles.primaryButton} type="button" onClick={() => loadEmployees()}>
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
                  <th>Documento</th>
                  <th>Nombre</th>
                  <th>Apellido</th>
                  <th>Teléfono</th>
                  <th>Correo</th>
                  <th>Especialidad</th>
                  <th>Comisión</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td data-label="Documento">
                      <span className={styles.documentCode}>{emp.document}</span>
                    </td>
                    <td data-label="Nombre">
                      <span className={styles.employeeName}>{emp.name}</span>
                    </td>
                    <td data-label="Apellido">{emp.last_name}</td>
                    <td data-label="Teléfono">{emp.phone}</td>
                    <td data-label="Correo">{emp.email ?? '—'}</td>
                    <td data-label="Especialidad"><span className={styles.specialtyText}>{emp.specialty}</span></td>
                    <td data-label="Comisión">{Number(emp.commission_percent ?? 0)}%</td>
                    <td data-label="Estado">
                      <span
                        className={styles.statusBadge}
                        style={STATUS_COLORS[emp.status] ? {
                          background: STATUS_COLORS[emp.status].bg,
                          color: STATUS_COLORS[emp.status].color,
                        } : undefined}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div className={styles.actionGroup}>
                        <button
                          className={styles.statusButton}
                          type="button"
                          onClick={() => openEarningsModal(emp)}
                        >
                          Ganancias
                        </button>
                        <button
                          className={styles.statusButton}
                          type="button"
                          onClick={() => openStatusModal(emp)}
                        >
                          Estado
                        </button>
                        <button
                          className={styles.deleteButton}
                          type="button"
                          disabled={deleting && deleteTarget?.id === emp.id}
                          onClick={() => handleDeleteClick(emp)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className={styles.emptyState}>
                      {hasFilters
                        ? 'Sin resultados para los filtros aplicados.'
                        : 'No hay empleados registrados aún.'}
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

      {/* ── Productivity section ─────────────────────────── */}
      <div className={styles.productivitySection}>
        <div className={styles.productivityHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Productividad del equipo</h2>
            <p className={styles.sectionSub}>Métricas en tiempo real basadas en órdenes de trabajo asignadas.</p>
          </div>
          <div className={styles.statTabs}>
            {['ordenes', 'ganancias'].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`${styles.statTab} ${activeStatTab === tab ? styles.statTabActive : ''}`}
                onClick={() => setActiveStatTab(tab)}
              >
                {tab === 'ordenes' ? 'Órdenes' : 'Ganancias'}
              </button>
            ))}
          </div>
        </div>

        {statsLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} aria-hidden="true" />
            <p>Cargando estadísticas...</p>
          </div>
        ) : (
          <>
            {/* Employee of the month */}
            {topEmployee && topEmployee.completed_orders > 0 ? (
              <div className={styles.eomBanner}>
                <div className={styles.eomLeft}>
                  <span className={styles.eomTrophy} aria-hidden="true">🏆</span>
                  <div>
                    <p className={styles.eomLabel}>Empleado del mes</p>
                    <p className={styles.eomName}>{topEmployee.employee_name}</p>
                    <p className={styles.eomSpec}>{topEmployee.specialty}</p>
                  </div>
                </div>
                <div className={styles.eomStats}>
                  <div className={styles.eomStat}>
                    <strong>{topEmployee.completed_orders}</strong>
                    <span>Completadas</span>
                  </div>
                  <div className={styles.eomStat}>
                    <strong>{topEmployee.total_orders}</strong>
                    <span>Total órdenes</span>
                  </div>
                  <div className={styles.eomStat}>
                    <strong>{fmtCOP(topEmployee.services_revenue)}</strong>
                    <span>Ingresos generados</span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Stats grid */}
            {stats.length > 0 ? (
              <div className={styles.statsGrid}>
                {stats.map((emp, idx) => {
                  const productivity = emp.total_orders > 0
                    ? Math.round((emp.completed_orders / emp.total_orders) * 100)
                    : 0
                  const inProcess = emp.total_orders - emp.completed_orders
                  const isTop = idx === 0 && emp.completed_orders > 0

                  return (
                    <div
                      key={emp.employee_id}
                      className={`${styles.statCard} ${isTop ? styles.statCardTop : ''}`}
                    >
                      <div className={styles.statCardHeader}>
                        <div className={styles.statAvatar} aria-hidden="true">
                          {initials(emp.employee_name)}
                        </div>
                        <div className={styles.statMeta}>
                          <span className={styles.statName}>{emp.employee_name}</span>
                          <span className={styles.statSpec}>{emp.specialty}</span>
                        </div>
                        <span
                          className={styles.statusBadge}
                          style={{
                            marginLeft: 'auto',
                            ...(STATUS_COLORS[emp.employee_status] ? {
                              background: STATUS_COLORS[emp.employee_status].bg,
                              color: STATUS_COLORS[emp.employee_status].color,
                            } : {}),
                          }}
                        >
                          {emp.employee_status}
                        </span>
                      </div>

                      {isTop ? (
                        <div className={styles.topBadge}>🥇 Mejor rendimiento</div>
                      ) : null}

                      {activeStatTab === 'ordenes' ? (
                        <>
                          <div className={styles.orderStats}>
                            <div className={styles.orderStat}>
                              <strong
                                className={styles.orderStatValue}
                                style={{ color: '#059669' }}
                              >
                                {emp.completed_orders}
                              </strong>
                              <span className={styles.orderStatLabel}>Completadas</span>
                            </div>
                            <div className={styles.orderStat}>
                              <strong
                                className={styles.orderStatValue}
                                style={{ color: '#EA580C' }}
                              >
                                {inProcess}
                              </strong>
                              <span className={styles.orderStatLabel}>En proceso</span>
                            </div>
                            <div className={styles.orderStat}>
                              <strong className={styles.orderStatValue}>{emp.total_orders}</strong>
                              <span className={styles.orderStatLabel}>Total</span>
                            </div>
                          </div>
                          <div className={styles.progressSection}>
                            <div className={styles.progressHeader}>
                              <span className={styles.progressLabel}>Efectividad</span>
                              <span className={styles.progressPct}>{productivity}%</span>
                            </div>
                            <div className={styles.progressTrack}>
                              <div
                                className={styles.progressFill}
                                style={{
                                  width: `${productivity}%`,
                                  background: productivity >= 70
                                    ? '#059669'
                                    : productivity >= 40
                                      ? '#D97706'
                                      : '#DC2626',
                                }}
                                role="progressbar"
                                aria-valuenow={productivity}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className={styles.earningsTabs}>
                          <EarningsTab label="Ganancias hoy" value={fmtCOP(emp.daily_earnings)} />
                          <EarningsTab label="Últimos 15 días" value={fmtCOP(emp.biweekly_earnings)} />
                          <EarningsTab label="Este mes" value={fmtCOP(emp.monthly_earnings)} />
                          {emp.services_revenue > 0 ? (
                            <div className={styles.revenueRow}>
                              <span className={styles.revenueLabel}>Ingresos totales</span>
                              <span className={styles.revenueValue}>{fmtCOP(emp.services_revenue)}</span>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className={styles.emptyHint}>
                {employees.length === 0
                  ? 'Registra empleados para ver estadísticas de productividad.'
                  : 'No hay datos de rendimiento disponibles aún.'}
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Create modal ──────────────────────────────────── */}
      {isModalOpen ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            aria-labelledby="employee-modal-title"
            className={styles.modal}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Registro</p>
                <h2 id="employee-modal-title">Nuevo empleado</h2>
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
                Tipo de documento *
                <select name="document_type" value={formData.document_type} onChange={handleInputChange} disabled={submitting}>
                  {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>

              <label className={styles.formField}>
                Documento *
                <input
                  inputMode="text"
                  name="document"
                  value={formData.document}
                  onChange={handleInputChange}
                  placeholder="80123456"
                  disabled={submitting}
                />
                {formErrors.document ? <span>{formErrors.document}</span> : null}
              </label>

              <label className={styles.formField}>
                Nombre *
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Jorge"
                  disabled={submitting}
                />
                {formErrors.name ? <span>{formErrors.name}</span> : null}
              </label>

              <label className={styles.formField}>
                Apellido *
                <input
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder="Pérez"
                  disabled={submitting}
                />
                {formErrors.last_name ? <span>{formErrors.last_name}</span> : null}
              </label>

              <label className={styles.formField}>
                Teléfono *
                <input
                  inputMode="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="3001112233"
                  disabled={submitting}
                />
                {formErrors.phone ? <span>{formErrors.phone}</span> : null}
              </label>

              <label className={styles.formField}>
                Correo electrónico
                <input
                  inputMode="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="empleado@enginesjds.com"
                  disabled={submitting}
                />
                {formErrors.email ? <span>{formErrors.email}</span> : null}
              </label>

              <label className={`${styles.formField} ${styles.fullWidth}`}>
                Especialidad *
                <input
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleInputChange}
                  placeholder="Mecánica general"
                  disabled={submitting}
                />
                {formErrors.specialty ? <span>{formErrors.specialty}</span> : null}
              </label>

              <label className={styles.formField}>
                Tarifa diaria (COP)
                <input
                  inputMode="decimal"
                  name="daily_rate"
                  value={formData.daily_rate}
                  onChange={handleInputChange}
                  placeholder="80000"
                  disabled={submitting}
                />
                {formErrors.daily_rate ? <span>{formErrors.daily_rate}</span> : null}
              </label>

              <label className={styles.formField}>
                Comisión (%)
                <input
                  inputMode="decimal"
                  name="commission_percent"
                  value={formData.commission_percent}
                  onChange={handleInputChange}
                  placeholder="60"
                  disabled={submitting}
                />
                {formErrors.commission_percent ? <span>{formErrors.commission_percent}</span> : null}
              </label>

              <label className={styles.formField}>
                Estado
                <select name="status" value={formData.status} onChange={handleInputChange} disabled={submitting}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>

              <label className={`${styles.formField} ${styles.fullWidth}`}>
                Fecha de contratación *
                <input
                  type="date"
                  name="hire_date"
                  value={formData.hire_date}
                  onChange={handleInputChange}
                  disabled={submitting}
                />
                {formErrors.hire_date ? <span>{formErrors.hire_date}</span> : null}
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
                  {submitting ? 'Guardando...' : 'Guardar empleado'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {/* ── Earnings modal ────────────────────────────────── */}
      {earningsTarget ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="earnings-modal-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Ganancias por comisión</p>
                <h2 id="earnings-modal-title">{earningsTarget.name} {earningsTarget.last_name}</h2>
              </div>
              <button
                className={styles.iconButton}
                type="button"
                onClick={closeEarningsModal}
                aria-label="Cerrar"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <div className={styles.form}>
              <label className={styles.formField}>
                Desde
                <input
                  type="date"
                  value={earningsFrom}
                  max={earningsTo || undefined}
                  onChange={(e) => handleEarningsRange(e.target.value, earningsTo)}
                />
              </label>

              <label className={styles.formField}>
                Hasta
                <input
                  type="date"
                  value={earningsTo}
                  min={earningsFrom || undefined}
                  onChange={(e) => handleEarningsRange(earningsFrom, e.target.value)}
                />
              </label>

              <div className={`${styles.formField} ${styles.fullWidth}`}>
                <span>Comisión del empleado (%)</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    style={{ flex: 1 }}
                    value={commissionInput}
                    onChange={(e) => setCommissionInput(e.target.value)}
                    disabled={commissionSaving}
                  />
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={handleSaveCommission}
                    disabled={commissionSaving || Number(commissionInput) === Number(earningsTarget.commission_percent ?? 0)}
                  >
                    {commissionSaving ? 'Guardando…' : 'Guardar %'}
                  </button>
                </div>
              </div>

              {earningsLoading ? (
                <div className={`${styles.fullWidth} ${styles.loadingState}`}>
                  <div className={styles.spinner} aria-hidden="true" />
                  <p>Calculando…</p>
                </div>
              ) : earningsData ? (
                <div className={styles.fullWidth}>
                  <div className={styles.earningsSummary}>
                    <div className={styles.earningTab}>
                      <span className={styles.earningValue}>{fmtCOP(earningsData.labor_total)}</span>
                      <span className={styles.earningLabel}>Mano de obra generada</span>
                    </div>
                    <div className={styles.earningTab}>
                      <span className={styles.earningValue} style={{ color: '#34d399' }}>
                        {fmtCOP(earningsData.commission_amount)}
                      </span>
                      <span className={styles.earningLabel}>
                        Comisión ({Number(earningsData.employee.commission_percent)}%)
                      </span>
                    </div>
                    <div className={styles.earningTab}>
                      <span className={styles.earningValue}>{earningsData.orders_count}</span>
                      <span className={styles.earningLabel}>Órdenes atendidas</span>
                    </div>
                    <div className={styles.earningTab}>
                      <span className={styles.earningValue} style={{ color: '#34d399' }}>
                        {fmtCOP(earningsData.quick_jobs_total)}
                      </span>
                      <span className={styles.earningLabel}>Trabajos rápidos</span>
                    </div>
                  </div>

                  <div className={styles.earningsOrderRow} style={{ fontWeight: 700 }}>
                    <span>Total a pagar en el rango</span>
                    <span>{fmtCOP(earningsData.total_earnings)}</span>
                  </div>

                  {earningsData.orders.length > 0 ? (
                    <div className={styles.earningsOrders}>
                      {earningsData.orders.map((o) => (
                        <div key={o.id} className={styles.earningsOrderRow}>
                          <div>
                            <strong>{o.order_number}</strong>
                            <span className={styles.earningsOrderMeta}>
                              {' '}· {o.motorcycle_plate} {o.motorcycle_brand} · {o.status}
                            </span>
                            <span className={styles.earningsOrderMeta}>
                              {' '}· Mano de obra {fmtCOP(o.labor_cost)}
                            </span>
                          </div>
                          <span>{fmtCOP(o.final_price)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyHint}>
                      Sin órdenes asignadas a este empleado en el rango seleccionado.
                    </p>
                  )}

                  <p className={styles.eyebrow} style={{ marginTop: 16 }}>Trabajos rápidos del rango</p>
                  {earningsData.quick_jobs.length > 0 ? (
                    <div className={styles.earningsOrders}>
                      {earningsData.quick_jobs.map((j) => (
                        <div key={j.id} className={styles.earningsOrderRow}>
                          <div>
                            <strong>{j.description}</strong>
                            <span className={styles.earningsOrderMeta}>
                              {' '}· {new Date(j.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <span>{fmtCOP(j.price)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyHint}>
                      Sin trabajos rápidos registrados en el rango seleccionado.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {/* ── Status change modal ───────────────────────────── */}
      {statusTarget ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-modal-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Cambiar estado</p>
                <h2 id="status-modal-title">{statusTarget.name} {statusTarget.last_name}</h2>
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

            <form className={styles.form} onSubmit={handleStatusSubmit}>
              <div className={`${styles.formField} ${styles.fullWidth}`}>
                <p style={{ margin: '0 0 10px', fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)' }}>
                  Estado actual: <strong style={{ color: '#fff' }}>{statusTarget.status}</strong>
                </p>
                <div className={styles.statusOptions}>
                  {STATUSES.map((s) => (
                    <label
                      key={s}
                      className={styles.statusOption}
                      style={statusNew === s && STATUS_COLORS[s] ? {
                        borderColor: STATUS_COLORS[s].color,
                        background: STATUS_COLORS[s].bg + '22',
                      } : undefined}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={s}
                        checked={statusNew === s}
                        onChange={() => setStatusNew(s)}
                        disabled={statusSubmitting}
                      />
                      <span
                        className={styles.statusBadge}
                        style={STATUS_COLORS[s] ? {
                          background: STATUS_COLORS[s].bg,
                          color: STATUS_COLORS[s].color,
                        } : undefined}
                      >
                        {s}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.formActions}>
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
                  type="submit"
                  disabled={statusSubmitting || statusNew === statusTarget.status}
                >
                  {statusSubmitting ? 'Guardando...' : 'Cambiar estado'}
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
            aria-labelledby="delete-emp-title"
            aria-describedby="delete-emp-desc"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={`${styles.eyebrow} ${styles.eyebrowDanger}`}>Acción irreversible</p>
                <h2 id="delete-emp-title">Eliminar empleado</h2>
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

            <p id="delete-emp-desc" className={styles.deleteDesc}>
              Estás a punto de eliminar al empleado{' '}
              <strong>&ldquo;{deleteTarget.name} {deleteTarget.last_name}&rdquo;</strong>.
              Esta acción aplica una baja lógica y no puede deshacerse.
            </p>

            <label className={`${styles.formField} ${styles.fullWidth}`}>
              Motivo de eliminación <span className={styles.required}>*</span>
              <textarea
                className={`${styles.textarea} ${deleteReasonError ? styles.textareaError : ''}`}
                rows={4}
                placeholder="Describe el motivo por el que se da de baja a este empleado..."
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

import { useEffect, useMemo, useState } from 'react'
import { getAppointments, saveAppointments } from '../../../services/appointmentsService'
import { getOrders, saveOrders } from '../../../services/ordersService'
import { ConfirmModal } from '../../../components/ConfirmModal/ConfirmModal'
import styles from './Citas.module.css'

const APPOINTMENT_STATUSES = ['Pendiente', 'Confirmada', 'Atendida', 'Cancelada']

const STATUS_STYLES = {
  Pendiente:  { background: '#FEF3C7', color: '#D97706' },
  Confirmada: { background: '#DBEAFE', color: '#2563EB' },
  Atendida:   { background: '#D1FAE5', color: '#059669' },
  Cancelada:  { background: '#FEE2E2', color: '#DC2626' },
}

function generateOrderNumber(orders) {
  const year = new Date().getFullYear()
  const max = orders.reduce((acc, o) => {
    const n = Number(o.orderNumber?.split('-')[2]) || 0
    return Math.max(acc, n)
  }, 0)
  return `OT-${year}-${String(max + 1).padStart(3, '0')}`
}

export function Citas() {
  const [appointments, setAppointments] = useState(() => getAppointments([]))
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [convertTarget, setConvertTarget] = useState(null)

  useEffect(() => {
    saveAppointments(appointments)
  }, [appointments])

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return appointments.filter((a) => {
      const matchSearch =
        !q ||
        a.name?.toLowerCase().includes(q) ||
        a.plate?.toLowerCase().includes(q) ||
        a.service?.toLowerCase().includes(q)
      const matchStatus = !filterStatus || a.status === filterStatus
      return matchSearch && matchStatus
    })
  }, [appointments, searchQuery, filterStatus])

  const pendingCount = useMemo(
    () => appointments.filter((a) => a.status === 'Pendiente').length,
    [appointments],
  )

  function handleChangeStatus(id, newStatus) {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)),
    )
  }

  function handleDeleteConfirm() {
    setAppointments((prev) => prev.filter((a) => a.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  function handleConfirmConvert() {
    const appt = convertTarget
    const orders = getOrders([])
    const newOrder = {
      id: crypto.randomUUID(),
      orderNumber: generateOrderNumber(orders),
      clientName: appt.name,
      motorcycle: appt.plate ? `${appt.plate} - ${appt.brand || ''}`.trim() : appt.brand || '',
      assignedEmployee: '',
      repuesto: '',
      costoEstimado: '',
      mileage: '',
      faultDescription: [appt.service, appt.notes].filter(Boolean).join('. '),
      entryDate: new Date().toLocaleDateString('es-CO'),
      status: 'Recibida',
    }
    saveOrders([newOrder, ...orders])
    setAppointments((prev) => prev.filter((a) => a.id !== appt.id))
    setConvertTarget(null)
  }

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Módulo administrativo</p>
          <h1 className={styles.title}>Citas</h1>
          <p className={styles.subtitle}>Gestión de citas agendadas por clientes.</p>
        </div>
        <div className={styles.headerStats}>
          <span className={styles.statChip}>{appointments.length} citas totales</span>
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {APPOINTMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

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
            {filtered.map((appt) => (
              <tr key={appt.id}>
                <td data-label="Cliente">
                  <div className={styles.clientCell}>
                    <strong>{appt.name}</strong>
                    {appt.phone ? <span className={styles.clientPhone}>{appt.phone}</span> : null}
                  </div>
                </td>
                <td data-label="Moto / Placa">
                  <div className={styles.motoCell}>
                    <span className={styles.plate}>{appt.plate || '—'}</span>
                    {appt.brand ? <span className={styles.brand}>{appt.brand}</span> : null}
                  </div>
                </td>
                <td data-label="Servicio">{appt.service || '—'}</td>
                <td data-label="Fecha">{appt.date || '—'}</td>
                <td data-label="Hora">{appt.time || '—'}</td>
                <td data-label="Estado">
                  <select
                    className={styles.statusSelect}
                    style={STATUS_STYLES[appt.status] ?? {}}
                    value={appt.status}
                    onChange={(e) => handleChangeStatus(appt.id, e.target.value)}
                  >
                    {APPOINTMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td data-label="Acciones">
                  <div className={styles.actions}>
                    {appt.status !== 'Atendida' && appt.status !== 'Cancelada' ? (
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
                      onClick={() => setDeleteTarget({ id: appt.id, label: appt.name || 'esta cita' })}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyState}>
                  {searchQuery || filterStatus
                    ? 'Sin resultados para los filtros aplicados'
                    : 'No hay citas registradas aún. Las citas del formulario público aparecerán aquí.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Confirm delete */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        entityLabel={deleteTarget?.label ?? ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Confirm convert to order */}
      {convertTarget ? (
        <div className={styles.convertBackdrop} role="presentation">
          <section
            className={styles.convertModal}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="convert-title"
            aria-describedby="convert-desc"
          >
            <h2 id="convert-title" className={styles.convertTitle}>Crear orden de trabajo</h2>
            <p id="convert-desc" className={styles.convertDesc}>
              Se creará una nueva OT con estado <strong>Recibida</strong> para{' '}
              <strong>{convertTarget.name}</strong> ({convertTarget.plate || convertTarget.brand || 'sin moto'})
              con el servicio <strong>{convertTarget.service}</strong>. La cita será eliminada.
            </p>
            <div className={styles.convertActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setConvertTarget(null)}>
                Cancelar
              </button>
              <button type="button" className={styles.confirmBtn} onClick={handleConfirmConvert}>
                Confirmar y crear orden
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}

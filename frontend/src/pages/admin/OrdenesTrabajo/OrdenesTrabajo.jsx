import { useCallback, useEffect, useRef, useState } from 'react'
import { ordersApi, clientsApi, motorcyclesApi, employeesApi, inventoryApi } from '../../../api'
import { Pagination } from '../../../components/Pagination/Pagination'
import { useToast } from '../../../hooks/useToast'
import styles from './OrdenesTrabajo.module.css'

const TRACKING_BASE_URL = `${window.location.origin}/tracking`
const WHATSAPP_NUMBER   = '573000000000'

const VALID_STATUSES    = ['Pendiente', 'En proceso', 'En reparación', 'Esperando repuesto', 'Listo', 'Lista para entrega', 'Entregada']
const CHANGEABLE        = ['Pendiente', 'En proceso', 'En reparación', 'Esperando repuesto', 'Listo', 'Lista para entrega']
const PAYMENT_METHODS   = ['Efectivo', 'Transferencia', 'Tarjeta', 'Nequi', 'Daviplata', 'Otro']
const PAYMENT_STATUSES  = ['Pagado', 'Pendiente', 'Parcial']

const STATUS_STYLES = {
  'Pendiente':           { background: '#dbeafe', color: '#1d4ed8' },
  'En proceso':          { background: '#ffedd5', color: '#9a3412' },
  'En reparación':       { background: '#ffedd5', color: '#9a3412' },
  'Esperando repuesto':  { background: '#fef3c7', color: '#92400e' },
  'Listo':               { background: '#ede9fe', color: '#6d28d9' },
  'Lista para entrega':  { background: '#ede9fe', color: '#6d28d9' },
  'Entregada':           { background: '#d1fae5', color: '#047857' },
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO')
}

function formatCurrency(n) {
  if (n === null || n === undefined || n === '') return '—'
  return `$ ${Number(n).toLocaleString('es-CO')}`
}

function buildWhatsAppUrl(order) {
  const trackingLink = `${TRACKING_BASE_URL}/${order.tracking_token}`
  const clientName = order.client_name || order.client_last_name
    ? `${order.client_name || ''} ${order.client_last_name || ''}`.trim()
    : 'Cliente'
  const brand = order.motorcycle_brand || ''
  const plate = order.motorcycle_plate || ''
  const phone = (order.client_phone || '').replace(/\D/g, '')
  const target = phone.startsWith('57') ? phone : `57${phone}`

  const msg = [
    `Hola ${clientName} `,
    '',
    `Tu motocicleta ${brand} ${plate} fue recibida correctamente en ENGINES JDS.`,
    '',
    'Puedes consultar el estado de tu moto aquí:',
    trackingLink,
    '',
    'Gracias por tu confianza.',
  ].join('\n')

  return `https://wa.me/${target}?text=${encodeURIComponent(msg)}`
}

function emptyCreate() {
  return {
    client_id: '', motorcycle_id: '', assigned_employee_id: '',
    problem_description: '',
    labor_cost: '', discount: '',
  }
}

function emptyEdit(order = {}) {
  return {
    assigned_employee_id: order.assigned_employee_id  ?? '',
    diagnostic_notes:     order.diagnostic_notes ?? '',
    labor_cost:           order.labor_cost       ?? '',
    discount:             order.discount         ?? '',
  }
}

// La bitácora de trabajos se guarda en work_notes como una línea por entrada
function parseWorkLog(text) {
  return (text ?? '')
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)
}

function serializeWorkLog(entries) {
  return entries.join('\n')
}

function emptySvc() {
  return {
    service_catalog_id: '', service_name: '', description: '',
    quantity: '1', unit_price: '', employee_id: '', notes: '',
  }
}

export function OrdenesTrabajo() {
  const toast      = useToast()
  const mountedRef = useRef(true)

  // ── List ──────────────────────────────────────────────────
  const [orders, setOrders]       = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  // ── Search / filters ──────────────────────────────────────
  const [searchInput, setSearchInput]     = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [filterStatus, setFilterStatus]   = useState('')
  const [filterEmployee, setFilterEmployee] = useState('')
  const searchTimerRef = useRef(null)

  // ── Reference data ────────────────────────────────────────
  const [employees, setEmployees]   = useState([])

  // ── Create modal ──────────────────────────────────────────
  const [createOpen, setCreateOpen]     = useState(false)
  const [clients, setClients]           = useState([])
  const [motorcycles, setMotorcycles]   = useState([])
  const [createForm, setCreateForm]     = useState(emptyCreate)
  const [createErrors, setCreateErrors] = useState({})
  const [creating, setCreating]         = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [motoSearch, setMotoSearch]     = useState('')

  // ── Edit modal ────────────────────────────────────────────
  const [editTarget, setEditTarget]   = useState(null)
  const [editForm, setEditForm]       = useState({})
  const [editing, setEditing]         = useState(false)
  const [workLogEntries, setWorkLogEntries] = useState([])
  const [workLogInput, setWorkLogInput]     = useState('')

  // ── Detail modal ──────────────────────────────────────────
  const [detailTarget, setDetailTarget]   = useState(null)
  const [detailHistory, setDetailHistory] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // ── Status change ─────────────────────────────────────────
  const [changingStatusId, setChangingStatusId] = useState(null)

  // ── Add service ───────────────────────────────────────────
  const [addSvcOpen, setAddSvcOpen]     = useState(false)
  const [serviceCatalog, setServiceCatalog] = useState([])
  const [svcForm, setSvcForm]           = useState(emptySvc)
  const [svcErrors, setSvcErrors]       = useState({})
  const [addingSvc, setAddingSvc]       = useState(false)

  // ── Add part ──────────────────────────────────────────────
  const [addPartOpen, setAddPartOpen]   = useState(false)
  const [inventoryItems, setInventoryItems] = useState([])
  const [partForm, setPartForm]         = useState({ inventory_id: '', quantity: '1' })
  const [partSearch, setPartSearch]     = useState('')
  const [partErrors, setPartErrors]     = useState({})
  const [addingPart, setAddingPart]     = useState(false)

  // ── Close order ───────────────────────────────────────────
  const [closeTarget, setCloseTarget] = useState(null)
  const [closeForm, setCloseForm]     = useState({ payment_method: '', payment_status: 'Pagado', notes: '' })
  const [closing, setClosing]         = useState(false)

  // ── WhatsApp confirmation after create ─────────────────
  const [whatsappOrder, setWhatsappOrder]       = useState(null)

  // ── Delete ────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget]         = useState(null)
  const [deleteReason, setDeleteReason]         = useState('')
  const [deleteReasonError, setDeleteReasonError] = useState('')
  const [deleting, setDeleting]                 = useState(false)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  // ── Load orders ───────────────────────────────────────────
  const loadOrders = useCallback(async (opts = {}) => {
    if (!opts.silent) setLoading(true)
    setError(null)
    try {
      const res = await ordersApi.getAll({
        search:      searchApplied  || undefined,
        status:      filterStatus   || undefined,
        employee_id: filterEmployee || undefined,
        sort:        'entry_date',
        page,
        limit:       20,
      })
      if (!mountedRef.current) return
      setOrders(res.data ?? [])
      setPagination(res.pagination ?? null)
    } catch {
      if (!mountedRef.current) return
      setError('No se pudieron cargar las órdenes. Intenta de nuevo.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [page, searchApplied, filterStatus, filterEmployee])

  useEffect(() => { loadOrders() }, [loadOrders])

  // ── Load technicians (empleados activos) ───────────────────
  const loadEmployees = useCallback(async () => {
    try {
      const res = await employeesApi.getAll({ status: 'Activo', limit: 200 })
      if (mountedRef.current) setEmployees(res.data ?? [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadEmployees() }, [loadEmployees])

  // ── Search debounce ───────────────────────────────────────
  function handleSearchChange(e) {
    const val = e.target.value
    setSearchInput(val)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setPage(1)
      setSearchApplied(val.trim())
    }, 400)
  }

  // ── Create ────────────────────────────────────────────────
  async function openCreate() {
    setCreateForm(emptyCreate())
    setCreateErrors({})
    setMotorcycles([])
    setClientSearch('')
    setMotoSearch('')
    setCreateOpen(true)
    try {
      const res = await clientsApi.getAll({ limit: 200 })
      if (mountedRef.current) setClients(res.data ?? [])
    } catch { /* ignore */ }
  }

  async function handleClientSelect(client_id) {
    setCreateForm((p) => ({ ...p, client_id: String(client_id), motorcycle_id: '' }))
    setClientSearch('')
    setMotoSearch('')
    setMotorcycles([])
    setCreateErrors((p) => ({ ...p, client_id: undefined }))
    try {
      const res = await motorcyclesApi.getAll({ client_id, limit: 100 })
      if (mountedRef.current) setMotorcycles(res.data ?? [])
    } catch { /* ignore */ }
  }

  async function handleCreateSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!createForm.client_id) errs.client_id = 'Selecciona un cliente.'
    if (!createForm.motorcycle_id) errs.motorcycle_id = 'Selecciona una motocicleta.'
    if (!createForm.problem_description.trim()) errs.problem_description = 'La descripción es obligatoria.'
    else if (createForm.problem_description.trim().length < 10) errs.problem_description = 'Mínimo 10 caracteres.'
    if (Object.keys(errs).length) { setCreateErrors(errs); return }

    setCreating(true)
    try {
      const newOrder = await ordersApi.create({
        client_id:              Number(createForm.client_id),
        motorcycle_id:          Number(createForm.motorcycle_id),
        problem_description:    createForm.problem_description.trim(),
        assigned_employee_id:   createForm.assigned_employee_id ? Number(createForm.assigned_employee_id) : undefined,
        labor_cost:             createForm.labor_cost !== '' ? Number(createForm.labor_cost) : undefined,
        discount:               createForm.discount   !== '' ? Number(createForm.discount)   : undefined,
      })
      if (!mountedRef.current) return
      toast.success('Orden de trabajo creada exitosamente')
      setCreateOpen(false)
      loadOrders({ silent: true })
      if (newOrder?.tracking_token && newOrder?.client_phone) {
        setWhatsappOrder(newOrder)
      }
    } catch (err) {
      if (!mountedRef.current) return
      toast.error(err?.response?.data?.message ?? 'No se pudo crear la orden')
    } finally {
      if (mountedRef.current) setCreating(false)
    }
  }

  // ── Edit ──────────────────────────────────────────────────
  async function openEdit(order) {
    setEditTarget(order)
    setEditForm(emptyEdit(order))
    setWorkLogEntries(parseWorkLog(order.work_notes))
    setWorkLogInput('')
    setAddSvcOpen(false)
    setAddPartOpen(false)
    setDetailHistory(null)
    loadEmployees()
    await loadDetail(order.id)
  }

  function closeEdit() {
    setEditTarget(null)
    setAddSvcOpen(false)
    setAddPartOpen(false)
  }

  function handleAddWorkLogEntry() {
    const entry = workLogInput.trim()
    if (!entry) return
    setWorkLogEntries((prev) => [...prev, entry])
    setWorkLogInput('')
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    setEditing(true)
    try {
      const payload = {
        assigned_employee_id:    editForm.assigned_employee_id ? Number(editForm.assigned_employee_id) : null,
        diagnostic_notes:        editForm.diagnostic_notes.trim() || null,
        work_notes:              serializeWorkLog(workLogEntries) || null,
        labor_cost:              editForm.labor_cost !== '' ? Number(editForm.labor_cost) : undefined,
        discount:                editForm.discount   !== '' ? Number(editForm.discount)   : undefined,
      }

      await ordersApi.update(editTarget.id, payload)
      if (!mountedRef.current) return
      toast.success('Orden actualizada correctamente')
      setEditTarget(null)
      loadOrders({ silent: true })
      if (detailTarget?.id === editTarget.id) loadDetail(editTarget.id)
    } catch (err) {
      if (!mountedRef.current) return
      toast.error(err?.response?.data?.message ?? 'No se pudo actualizar la orden')
    } finally {
      if (mountedRef.current) setEditing(false)
    }
  }

  // ── Status change ─────────────────────────────────────────
  async function handleChangeStatus(order, newStatus) {
    if (newStatus === order.status) return
    setChangingStatusId(order.id)
    try {
      await ordersApi.changeStatus(order.id, { status: newStatus })
      if (!mountedRef.current) return
      toast.success(`Estado → "${newStatus}"`)
      loadOrders({ silent: true })
      if (detailTarget?.id === order.id) loadDetail(order.id)
    } catch (err) {
      if (!mountedRef.current) return
      toast.error(err?.response?.data?.message ?? 'No se pudo cambiar el estado')
    } finally {
      if (mountedRef.current) setChangingStatusId(null)
    }
  }

  // ── Detail ────────────────────────────────────────────────
  async function loadDetail(id) {
    setDetailLoading(true)
    try {
      const history = await ordersApi.getHistory(id)
      if (!mountedRef.current) return
      setDetailHistory(history)
    } catch {
      if (!mountedRef.current) return
      toast.error('No se pudo cargar el detalle de la orden')
    } finally {
      if (mountedRef.current) setDetailLoading(false)
    }
  }

  async function openDetail(order) {
    setDetailTarget(order)
    setDetailHistory(null)
    await loadDetail(order.id)
  }

  function closeDetail() {
    setDetailTarget(null)
    setDetailHistory(null)
  }

  // ── Add service ───────────────────────────────────────────
  async function handleOpenAddSvc() {
    setAddSvcOpen(true)
    setSvcForm(emptySvc())
    setSvcErrors({})
    if (!serviceCatalog.length) {
      try {
        const catalog = await ordersApi.getServiceCatalog()
        if (mountedRef.current) setServiceCatalog(catalog ?? [])
      } catch { /* ignore */ }
    }
  }

  function handleCatalogSelect(e) {
    const catalog_id = e.target.value
    const item = serviceCatalog.find((s) => String(s.id) === catalog_id)
    setSvcForm((p) => ({
      ...p,
      service_catalog_id: catalog_id,
      service_name: item ? item.name : p.service_name,
      unit_price:   item ? String(item.base_price) : p.unit_price,
    }))
  }

  async function handleAddSvc(e) {
    e.preventDefault()
    const errs = {}
    if (!svcForm.service_catalog_id) {
      if (!svcForm.service_name.trim()) errs.service_name = 'Nombre del servicio requerido.'
      if (!svcForm.unit_price)          errs.unit_price   = 'Precio unitario requerido.'
    }
    if (Object.keys(errs).length) { setSvcErrors(errs); return }

    setAddingSvc(true)
    try {
      await ordersApi.addService(editTarget.id, {
        service_catalog_id: svcForm.service_catalog_id ? Number(svcForm.service_catalog_id) : undefined,
        service_name:       svcForm.service_name.trim() || undefined,
        description:        svcForm.description.trim()  || undefined,
        quantity:           svcForm.quantity ? Number(svcForm.quantity) : undefined,
        unit_price:         svcForm.unit_price ? Number(svcForm.unit_price) : undefined,
        employee_id:        svcForm.employee_id ? Number(svcForm.employee_id) : undefined,
        notes:              svcForm.notes.trim() || undefined,
      })
      if (!mountedRef.current) return
      toast.success('Servicio agregado')
      setAddSvcOpen(false)
      loadDetail(editTarget.id)
      loadOrders({ silent: true })
    } catch (err) {
      if (!mountedRef.current) return
      toast.error(err?.response?.data?.message ?? 'No se pudo agregar el servicio')
    } finally {
      if (mountedRef.current) setAddingSvc(false)
    }
  }

  async function handleRemoveSvc(serviceId) {
    try {
      await ordersApi.removeService(editTarget.id, serviceId)
      if (!mountedRef.current) return
      toast.success('Servicio eliminado')
      loadDetail(editTarget.id)
      loadOrders({ silent: true })
    } catch (err) {
      if (!mountedRef.current) return
      toast.error(err?.response?.data?.message ?? 'No se pudo eliminar')
    }
  }

  // ── Add part ──────────────────────────────────────────────
  async function handleOpenAddPart() {
    setAddPartOpen(true)
    setPartForm({ inventory_id: '', quantity: '1' })
    setPartSearch('')
    setPartErrors({})
    if (!inventoryItems.length) {
      try {
        const res = await inventoryApi.getAll({ limit: 200 })
        if (mountedRef.current) setInventoryItems(res.data ?? [])
      } catch { /* ignore */ }
    }
  }

  async function handleAddPart(e) {
    e.preventDefault()
    const errs = {}
    if (!partForm.inventory_id) errs.inventory_id = 'Selecciona un repuesto.'
    if (!partForm.quantity || Number(partForm.quantity) < 1) errs.quantity = 'Mínimo 1.'
    if (Object.keys(errs).length) { setPartErrors(errs); return }

    setAddingPart(true)
    try {
      await ordersApi.addPart(editTarget.id, {
        inventory_id: Number(partForm.inventory_id),
        quantity:     Number(partForm.quantity),
      })
      if (!mountedRef.current) return
      toast.success('Repuesto agregado')
      setPartForm({ inventory_id: '', quantity: '1' })
      setPartSearch('')
      setPartErrors({})
      loadDetail(editTarget.id)
      loadOrders({ silent: true })
    } catch (err) {
      if (!mountedRef.current) return
      toast.error(err?.response?.data?.message ?? 'No se pudo agregar el repuesto')
    } finally {
      if (mountedRef.current) setAddingPart(false)
    }
  }

  async function handleRemovePart(itemId) {
    try {
      await ordersApi.removePart(editTarget.id, itemId)
      if (!mountedRef.current) return
      toast.success('Repuesto eliminado')
      loadDetail(editTarget.id)
      loadOrders({ silent: true })
    } catch (err) {
      if (!mountedRef.current) return
      toast.error(err?.response?.data?.message ?? 'No se pudo eliminar')
    }
  }

  // ── Close order ───────────────────────────────────────────
  function openClose(order) {
    setCloseTarget(order)
    setCloseForm({ payment_method: '', payment_status: 'Pagado', notes: '' })
  }

  async function handleClose(e) {
    e.preventDefault()
    setClosing(true)
    try {
      await ordersApi.close(closeTarget.id, {
        payment_method: closeForm.payment_method || undefined,
        payment_status: closeForm.payment_status || undefined,
        notes:          closeForm.notes.trim()   || undefined,
      })
      if (!mountedRef.current) return
      toast.success(`Orden ${closeTarget.order_number} cerrada y entregada`)
      setCloseTarget(null)
      closeDetail()
      loadOrders({ silent: true })
    } catch (err) {
      if (!mountedRef.current) return
      toast.error(err?.response?.data?.message ?? 'No se pudo cerrar la orden')
    } finally {
      if (mountedRef.current) setClosing(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────
  function openDelete(order) {
    setDeleteTarget({ id: order.id, label: order.order_number })
    setDeleteReason('')
    setDeleteReasonError('')
  }

  async function handleDelete() {
    if (!deleteReason.trim()) { setDeleteReasonError('El motivo es obligatorio.'); return }
    setDeleting(true)
    try {
      await ordersApi.remove(deleteTarget.id, deleteReason.trim())
      if (!mountedRef.current) return
      toast.success(`Orden "${deleteTarget.label}" eliminada`)
      setDeleteTarget(null)
      if (detailTarget?.id === deleteTarget.id) closeDetail()
      loadOrders({ silent: true })
    } catch (err) {
      if (!mountedRef.current) return
      toast.error(err?.response?.data?.message ?? 'No se pudo eliminar la orden')
    } finally {
      if (mountedRef.current) setDeleting(false)
    }
  }

  // ── Stats ─────────────────────────────────────────────────
  const totalCount  = pagination?.total ?? orders.length
  const activeCount = orders.filter((o) => o.status !== 'Entregada').length

  // ── Comboboxes buscables (crear orden) ────────────────────
  const selectedClient = clients.find((c) => String(c.id) === String(createForm.client_id))
  const selectedMoto   = motorcycles.find((m) => String(m.id) === String(createForm.motorcycle_id))

  const clientQuery = clientSearch.toLowerCase().trim()
  const filteredClients = clientQuery
    ? clients.filter((c) =>
        `${c.name} ${c.last_name}`.toLowerCase().includes(clientQuery) ||
        (c.document ?? '').toLowerCase().includes(clientQuery) ||
        (c.phone ?? '').includes(clientQuery)
      ).slice(0, 10)
    : []

  const motoQuery = motoSearch.toLowerCase().trim()
  const filteredMotos = motoQuery
    ? motorcycles.filter((m) =>
        m.plate.toLowerCase().includes(motoQuery) ||
        `${m.brand} ${m.model}`.toLowerCase().includes(motoQuery)
      ).slice(0, 10)
    : motorcycles.slice(0, 10)

  // ── Render ────────────────────────────────────────────────
  return (
    <section className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Módulo administrativo</p>
          <h1>Órdenes de Trabajo</h1>
          <p>Control de órdenes de reparación y mantenimiento de motocicletas.</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={openCreate}>
          Nueva orden
        </button>
      </div>

      {/* Summary */}
      <div className={styles.summaryBar}>
        <span>{totalCount} órdenes registradas</span>
        <span>{activeCount} activas</span>
      </div>

      {/* Filters */}
      <div className={styles.searchBar}>
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Buscar por OT, cliente o placa…"
            value={searchInput}
            onChange={handleSearchChange}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => { setPage(1); setFilterStatus(e.target.value) }}
        >
          <option value="">Todos los estados</option>
          {VALID_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className={styles.filterSelect}
          value={filterEmployee}
          onChange={(e) => { setPage(1); setFilterEmployee(e.target.value) }}
        >
          <option value="">Todos los técnicos</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.name} {emp.last_name}</option>
          ))}
        </select>
      </div>

      {/* Loading / Error */}
      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          Cargando órdenes…
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <p>{error}</p>
          <button type="button" className={styles.retryButton} onClick={() => loadOrders()}>
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Número OT</th>
                  <th>Cliente</th>
                  <th>Motocicleta</th>
                  <th>Técnico</th>
                  <th>Total</th>
                  <th>Ingreso</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const isChanging  = changingStatusId === order.id
                  const isEntregada = order.status === 'Entregada'
                  const canClose    = order.status === 'Listo' || order.status === 'Lista para entrega'

                  return (
                    <tr key={order.id}>
                      <td data-label="Número OT">
                        <span className={styles.orderNumber}>{order.order_number}</span>
                      </td>
                      <td data-label="Cliente">
                        <div>{order.client_name}</div>
                        {order.client_phone
                          ? <div className={styles.subText}>{order.client_phone}</div>
                          : null}
                      </td>
                      <td data-label="Motocicleta">
                        <div className={styles.plateText}>{order.motorcycle_plate}</div>
                        <div className={styles.subText}>{order.motorcycle_brand} {order.motorcycle_model}</div>
                      </td>
                      <td data-label="Técnico">{order.employee_name || '—'}</td>
                      <td data-label="Total">{formatCurrency(order.final_price)}</td>
                      <td data-label="Ingreso">{formatDate(order.entry_date)}</td>
                      <td data-label="Estado">
                        {isEntregada ? (
                          <span className={styles.statusBadge} style={STATUS_STYLES['Entregada']}>
                            Entregada
                          </span>
                        ) : (
                          <select
                            className={styles.statusSelect}
                            style={STATUS_STYLES[order.status] ?? {}}
                            value={order.status}
                            disabled={isChanging}
                            onChange={(e) => handleChangeStatus(order, e.target.value)}
                          >
                            {CHANGEABLE.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        )}
                      </td>
                      <td data-label="Acciones">
                        <div className={styles.actionsCell}>
                          <button
                            className={styles.detailButton}
                            type="button"
                            onClick={() => openDetail(order)}
                          >
                            Ver
                          </button>
                          <button
                            className={styles.pdfButton}
                            type="button"
                            title="Descargar PDF"
                            onClick={() => ordersApi.downloadPDF(order.id).catch(() => toast.error('Error al descargar PDF'))}
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" /><path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" /></svg>
                          </button>
                          {order.tracking_token && order.client_phone ? (
                            <a
                              className={styles.whatsappButton}
                              href={buildWhatsAppUrl(order)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Enviar por WhatsApp"
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                            </a>
                          ) : null}
                          {!isEntregada ? (
                            <button
                              className={styles.editButton}
                              type="button"
                              onClick={() => openEdit(order)}
                            >
                              Editar
                            </button>
                          ) : null}
                          {canClose ? (
                            <button
                              className={styles.closeButton}
                              type="button"
                              onClick={() => openClose(order)}
                            >
                              Cerrar
                            </button>
                          ) : null}
                          {!isEntregada ? (
                            <button
                              className={styles.deleteButton}
                              type="button"
                              onClick={() => openDelete(order)}
                            >
                              Eliminar
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={styles.emptyState}>
                      {searchInput || filterStatus || filterEmployee
                        ? 'Sin resultados para los filtros aplicados.'
                        : 'No hay órdenes de trabajo registradas.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={pagination?.totalPages}
            total={pagination?.total}
            onPageChange={setPage}
            disabled={loading}
          />
        </>
      )}

      {/* ── Create modal ────────────────────────────────── */}
      {createOpen ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="create-title">
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Registro</p>
                <h2 id="create-title">Nueva orden de trabajo</h2>
              </div>
              <button className={styles.iconButton} type="button" onClick={() => setCreateOpen(false)}>×</button>
            </div>
            <form className={styles.form} onSubmit={handleCreateSubmit}>
              <div className={styles.formField}>
                <span className={styles.addFormLabel}>
                  Cliente <span className={styles.required}>*</span>
                </span>
                {selectedClient ? (
                  <div className={styles.partSelected}>
                    <span>
                      {selectedClient.name} {selectedClient.last_name}
                      {selectedClient.document ? ` — ${selectedClient.document}` : ''}
                    </span>
                    <button
                      type="button"
                      className={styles.partClearBtn}
                      onClick={() => {
                        setCreateForm((p) => ({ ...p, client_id: '', motorcycle_id: '' }))
                        setMotorcycles([])
                        setClientSearch('')
                        setMotoSearch('')
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
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      autoComplete="off"
                    />
                    {clientQuery.length > 0 ? (
                      <ul className={styles.partDropdown}>
                        {filteredClients.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              className={styles.partDropdownItem}
                              onClick={() => handleClientSelect(c.id)}
                            >
                              <strong>{c.name} {c.last_name}</strong>
                              <span className={styles.partMeta}>
                                {[c.document, c.phone].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                              </span>
                            </button>
                          </li>
                        ))}
                        {filteredClients.length === 0 ? (
                          <li className={styles.partNoResults}>Sin resultados</li>
                        ) : null}
                      </ul>
                    ) : null}
                  </div>
                )}
                {createErrors.client_id ? <span>{createErrors.client_id}</span> : null}
              </div>

              <div className={styles.formField}>
                <span className={styles.addFormLabel}>
                  Motocicleta <span className={styles.required}>*</span>
                </span>
                {selectedMoto ? (
                  <div className={styles.partSelected}>
                    <span>{selectedMoto.plate} — {selectedMoto.brand} {selectedMoto.model} {selectedMoto.year}</span>
                    <button
                      type="button"
                      className={styles.partClearBtn}
                      onClick={() => {
                        setCreateForm((p) => ({ ...p, motorcycle_id: '' }))
                        setMotoSearch('')
                      }}
                    >
                      Cambiar
                    </button>
                  </div>
                ) : !createForm.client_id ? (
                  <div className={styles.partSelected}>
                    <span>Selecciona el cliente primero</span>
                  </div>
                ) : motorcycles.length === 0 ? (
                  <div className={styles.partSelected}>
                    <span>El cliente no tiene motos registradas</span>
                  </div>
                ) : (
                  <div className={styles.partAutocomplete}>
                    <input
                      type="search"
                      className={styles.partSearchInput}
                      placeholder="Escribe placa, marca o modelo…"
                      value={motoSearch}
                      onChange={(e) => setMotoSearch(e.target.value)}
                      autoComplete="off"
                    />
                    <ul className={styles.partDropdown}>
                      {filteredMotos.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            className={styles.partDropdownItem}
                            onClick={() => {
                              setCreateForm((p) => ({ ...p, motorcycle_id: String(m.id) }))
                              setMotoSearch('')
                              setCreateErrors((p) => ({ ...p, motorcycle_id: undefined }))
                            }}
                          >
                            <strong>{m.plate}</strong> — {m.brand} {m.model}
                            <span className={styles.partMeta}>Año {m.year}</span>
                          </button>
                        </li>
                      ))}
                      {filteredMotos.length === 0 ? (
                        <li className={styles.partNoResults}>Sin resultados</li>
                      ) : null}
                    </ul>
                  </div>
                )}
                {createErrors.motorcycle_id ? <span>{createErrors.motorcycle_id}</span> : null}
              </div>

              <label className={styles.formField}>
                Técnico asignado
                <select
                  value={createForm.assigned_employee_id}
                  onChange={(e) => setCreateForm((p) => ({ ...p, assigned_employee_id: e.target.value }))}
                >
                  <option value="">Sin asignar</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} {emp.last_name} — {emp.specialty}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.formField}>
                Mano de obra ($)
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="0"
                  value={createForm.labor_cost}
                  onChange={(e) => setCreateForm((p) => ({ ...p, labor_cost: e.target.value }))}
                />
              </label>

              <label className={styles.formField}>
                Descuento ($)
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="0"
                  value={createForm.discount}
                  onChange={(e) => setCreateForm((p) => ({ ...p, discount: e.target.value }))}
                />
              </label>

              <label className={`${styles.formField} ${styles.fullWidth}`}>
                Descripción del problema <span className={styles.required}>*</span>
                <textarea
                  rows={3}
                  maxLength={2000}
                  placeholder="Describe el problema que presenta la motocicleta…"
                  value={createForm.problem_description}
                  onChange={(e) => setCreateForm((p) => ({ ...p, problem_description: e.target.value }))}
                />
                {createErrors.problem_description ? <span>{createErrors.problem_description}</span> : null}
              </label>

              <div className={styles.formActions}>
                <button className={styles.secondaryButton} type="button" disabled={creating} onClick={() => setCreateOpen(false)}>
                  Cancelar
                </button>
                <button className={styles.primaryButton} type="submit" disabled={creating}>
                  {creating ? 'Creando…' : 'Crear orden'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {/* ── Edit modal ───────────────────────────────────── */}
      {editTarget ? (
        <div className={`${styles.modalBackdrop} ${styles.detailBackdrop}`} role="presentation">
          <section className={`${styles.modal} ${styles.detailModal}`} role="dialog" aria-modal="true" aria-labelledby="edit-title">
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Edición</p>
                <h2 id="edit-title">Editar {editTarget.order_number}</h2>
              </div>
              <button className={styles.iconButton} type="button" onClick={closeEdit}>×</button>
            </div>
            <form className={styles.form} onSubmit={handleEditSubmit}>
              <label className={styles.formField}>
                Técnico asignado
                <select
                  value={editForm.assigned_employee_id}
                  onChange={(e) => setEditForm((p) => ({ ...p, assigned_employee_id: e.target.value }))}
                >
                  <option value="">Sin asignar</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} {emp.last_name} — {emp.specialty}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.formField}>
                Mano de obra ($)
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={editForm.labor_cost}
                  onChange={(e) => setEditForm((p) => ({ ...p, labor_cost: e.target.value }))}
                />
              </label>

              <label className={styles.formField}>
                Descuento ($)
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={editForm.discount}
                  onChange={(e) => setEditForm((p) => ({ ...p, discount: e.target.value }))}
                />
              </label>

              <label className={`${styles.formField} ${styles.fullWidth}`}>
                Notas de diagnóstico
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={editForm.diagnostic_notes}
                  onChange={(e) => setEditForm((p) => ({ ...p, diagnostic_notes: e.target.value }))}
                />
              </label>

              <div className={`${styles.formField} ${styles.fullWidth}`}>
                <span className={styles.addFormLabel}>Trabajos realizados (bitácora)</span>
                {workLogEntries.length > 0 ? (
                  <div className={styles.itemList}>
                    {workLogEntries.map((entry, idx) => (
                      <div key={`${idx}-${entry}`} className={styles.itemRow}>
                        <div className={styles.itemInfo}>
                          <span>• {entry}</span>
                        </div>
                        <button
                          className={styles.removeItemBtn}
                          type="button"
                          title="Quitar trabajo"
                          onClick={() => setWorkLogEntries((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyItems}>Sin trabajos registrados aún.</p>
                )}
                <div className={styles.workLogAddRow}>
                  <input
                    type="text"
                    maxLength={200}
                    placeholder="Ej: Cambio de aceite, ajuste de frenos…"
                    value={workLogInput}
                    onChange={(e) => setWorkLogInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddWorkLogEntry()
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={handleAddWorkLogEntry}
                    disabled={!workLogInput.trim()}
                  >
                    Añadir
                  </button>
                </div>
              </div>

              <div className={styles.formActions}>
                <button className={styles.secondaryButton} type="button" disabled={editing} onClick={closeEdit}>
                  Cancelar
                </button>
                <button className={styles.primaryButton} type="submit" disabled={editing}>
                  {editing ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>

            {/* ── Servicios y repuestos (edición) ────────────── */}
            {detailLoading ? (
              <div className={styles.detailLoading}>
                <div className={styles.spinner} />
                Cargando servicios y repuestos…
              </div>
            ) : detailHistory ? (
              <div className={styles.detailBody}>
                {/* Services */}
                <div className={styles.detailSection}>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>
                      Servicios ({detailHistory.services.length})
                    </h3>
                    {detailHistory.order.status !== 'Entregada' ? (
                      <button className={styles.addItemBtn} type="button" onClick={handleOpenAddSvc}>
                        + Agregar servicio
                      </button>
                    ) : null}
                  </div>

                  {detailHistory.services.length > 0 ? (
                    <div className={styles.itemList}>
                      {detailHistory.services.map((svc) => (
                        <div key={svc.id} className={styles.itemRow}>
                          <div className={styles.itemInfo}>
                            <strong>{svc.service_name}</strong>
                            {svc.description
                              ? <span className={styles.itemDesc}>{svc.description}</span>
                              : null}
                            <span className={styles.itemMeta}>
                              x{svc.quantity} × {formatCurrency(svc.unit_price)} = {formatCurrency(svc.total_price)}
                              {svc.employee_name ? ` · ${svc.employee_name}` : ''}
                            </span>
                          </div>
                          {detailHistory.order.status !== 'Entregada' ? (
                            <button
                              className={styles.removeItemBtn}
                              type="button"
                              title="Eliminar servicio"
                              onClick={() => handleRemoveSvc(svc.id)}
                            >
                              ×
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyItems}>Sin servicios registrados.</p>
                  )}

                  {/* Add service sub-form */}
                  {addSvcOpen ? (
                    <form className={styles.addItemForm} onSubmit={handleAddSvc}>
                      <p className={styles.addFormTitle}>Agregar servicio</p>
                      <div className={styles.addFormGrid}>
                        <label className={styles.addFormField}>
                          Del catálogo (opcional)
                          <select value={svcForm.service_catalog_id} onChange={handleCatalogSelect}>
                            <option value="">Servicio manual…</option>
                            {serviceCatalog.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.category}) — {formatCurrency(s.base_price)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className={styles.addFormField}>
                          Nombre del servicio
                          {!svcForm.service_catalog_id
                            ? <span className={styles.required}>*</span>
                            : null}
                          <input
                            type="text"
                            placeholder="Ej: Cambio de aceite"
                            value={svcForm.service_name}
                            onChange={(e) => setSvcForm((p) => ({ ...p, service_name: e.target.value }))}
                          />
                          {svcErrors.service_name
                            ? <span className={styles.fieldError}>{svcErrors.service_name}</span>
                            : null}
                        </label>

                        <label className={styles.addFormField}>
                          Cantidad
                          <input
                            type="number"
                            min="1"
                            value={svcForm.quantity}
                            onChange={(e) => setSvcForm((p) => ({ ...p, quantity: e.target.value }))}
                          />
                        </label>

                        <label className={styles.addFormField}>
                          Precio unitario ($)
                          {!svcForm.service_catalog_id
                            ? <span className={styles.required}>*</span>
                            : null}
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            placeholder="0"
                            value={svcForm.unit_price}
                            onChange={(e) => setSvcForm((p) => ({ ...p, unit_price: e.target.value }))}
                          />
                          {svcErrors.unit_price
                            ? <span className={styles.fieldError}>{svcErrors.unit_price}</span>
                            : null}
                        </label>

                        <label className={styles.addFormField}>
                          Técnico (opcional)
                          <select
                            value={svcForm.employee_id}
                            onChange={(e) => setSvcForm((p) => ({ ...p, employee_id: e.target.value }))}
                          >
                            <option value="">Sin asignar</option>
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name} {emp.last_name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className={styles.addFormActions}>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => setAddSvcOpen(false)}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className={styles.primaryButton}
                          disabled={addingSvc}
                        >
                          {addingSvc ? 'Agregando…' : 'Agregar'}
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>

                {/* Parts */}
                <div className={styles.detailSection}>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>
                      Repuestos ({detailHistory.parts.length})
                    </h3>
                    {detailHistory.order.status !== 'Entregada' ? (
                      <button className={styles.addItemBtn} type="button" onClick={handleOpenAddPart}>
                        + Agregar repuesto
                      </button>
                    ) : null}
                  </div>

                  {detailHistory.parts.length > 0 ? (
                    <div className={styles.itemList}>
                      {detailHistory.parts.map((part) => (
                        <div key={part.id} className={styles.itemRow}>
                          <div className={styles.itemInfo}>
                            <strong>{part.part_name}</strong>
                            <span className={styles.itemMeta}>
                              {part.part_code} · x{part.quantity} × {formatCurrency(part.unit_price)} = {formatCurrency(part.total_price)}
                            </span>
                          </div>
                          {detailHistory.order.status !== 'Entregada' ? (
                            <button
                              className={styles.removeItemBtn}
                              type="button"
                              title="Eliminar repuesto"
                              onClick={() => handleRemovePart(part.id)}
                            >
                              ×
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyItems}>Sin repuestos registrados.</p>
                  )}

                  {/* Add part sub-form */}
                  {addPartOpen ? (
                    <form className={styles.addItemForm} onSubmit={handleAddPart}>
                      <p className={styles.addFormTitle}>Agregar repuesto</p>
                      <div className={styles.addFormGrid}>
                        <div className={`${styles.addFormField} ${styles.addFormFieldWide}`}>
                          <span className={styles.addFormLabel}>
                            Repuesto <span className={styles.required}>*</span>
                          </span>
                          {partForm.inventory_id ? (
                            <div className={styles.partSelected}>
                              {(() => {
                                const sel = inventoryItems.find((i) => String(i.id) === String(partForm.inventory_id))
                                return sel ? (
                                  <span>{sel.code} — {sel.name} (stock: {sel.quantity}) — {formatCurrency(sel.sale_price)}</span>
                                ) : null
                              })()}
                              <button
                                type="button"
                                className={styles.partClearBtn}
                                onClick={() => { setPartForm((p) => ({ ...p, inventory_id: '' })); setPartSearch('') }}
                              >
                                Cambiar
                              </button>
                            </div>
                          ) : (
                            <div className={styles.partAutocomplete}>
                              <input
                                type="search"
                                className={styles.partSearchInput}
                                placeholder="Buscar por código o nombre…"
                                value={partSearch}
                                onChange={(e) => setPartSearch(e.target.value)}
                                autoComplete="off"
                              />
                              {partSearch.trim().length > 0 && (
                                <ul className={styles.partDropdown}>
                                  {inventoryItems
                                    .filter((i) => i.status !== 'Agotado')
                                    .filter((i) => {
                                      const q = partSearch.toLowerCase()
                                      return i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
                                    })
                                    .slice(0, 10)
                                    .map((item) => (
                                      <li key={item.id}>
                                        <button
                                          type="button"
                                          className={styles.partDropdownItem}
                                          onClick={() => {
                                            setPartForm((p) => ({ ...p, inventory_id: String(item.id) }))
                                            setPartSearch('')
                                          }}
                                        >
                                          <strong>{item.code}</strong> — {item.name}
                                          <span className={styles.partMeta}>Stock: {item.quantity} · {formatCurrency(item.sale_price)}</span>
                                        </button>
                                      </li>
                                    ))}
                                  {inventoryItems
                                    .filter((i) => i.status !== 'Agotado')
                                    .filter((i) => {
                                      const q = partSearch.toLowerCase()
                                      return i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
                                    }).length === 0 && (
                                    <li className={styles.partNoResults}>Sin resultados</li>
                                  )}
                                </ul>
                              )}
                            </div>
                          )}
                          {partErrors.inventory_id
                            ? <span className={styles.fieldError}>{partErrors.inventory_id}</span>
                            : null}
                        </div>

                        <label className={styles.addFormField}>
                          Cantidad <span className={styles.required}>*</span>
                          <input
                            type="number"
                            min="1"
                            value={partForm.quantity}
                            onChange={(e) => setPartForm((p) => ({ ...p, quantity: e.target.value }))}
                          />
                          {partErrors.quantity
                            ? <span className={styles.fieldError}>{partErrors.quantity}</span>
                            : null}
                        </label>
                      </div>

                      <div className={styles.addFormActions}>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => setAddPartOpen(false)}
                        >
                          Cerrar
                        </button>
                        <button
                          type="submit"
                          className={styles.primaryButton}
                          disabled={addingPart}
                        >
                          {addingPart ? 'Agregando…' : 'Agregar repuesto'}
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {/* ── Detail modal ─────────────────────────────────── */}
      {detailTarget ? (
        <div className={`${styles.modalBackdrop} ${styles.detailBackdrop}`} role="presentation">
          <section
            className={`${styles.modal} ${styles.detailModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Detalle de orden</p>
                <h2 id="detail-title">
                  <span className={styles.orderNumber}>{detailTarget.order_number}</span>
                </h2>
                <p>{detailTarget.client_name} — {detailTarget.motorcycle_plate} {detailTarget.motorcycle_brand}</p>
              </div>
              <div className={styles.modalHeaderActions}>
                <button
                  className={styles.pdfButtonLg}
                  type="button"
                  onClick={() => ordersApi.downloadPDF(detailTarget.id).catch(() => toast.error('Error al descargar PDF'))}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" /><path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" /></svg>
                  Descargar PDF
                </button>
                {detailTarget.tracking_token && detailTarget.client_phone ? (
                  <a
                    className={styles.whatsappButtonLg}
                    href={buildWhatsAppUrl(detailTarget)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                    Enviar por WhatsApp
                  </a>
                ) : null}
                <button className={styles.iconButton} type="button" onClick={closeDetail}>×</button>
              </div>
            </div>

            {detailLoading ? (
              <div className={styles.detailLoading}>
                <div className={styles.spinner} />
                Cargando detalle…
              </div>
            ) : detailHistory ? (
              <div className={styles.detailBody}>
                {/* Info grid */}
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Estado</span>
                    <span className={styles.statusBadge} style={STATUS_STYLES[detailHistory.order.status] ?? {}}>
                      {detailHistory.order.status}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Técnico</span>
                    <span>{detailHistory.order.employee_name || '—'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Fecha ingreso</span>
                    <span>{formatDate(detailHistory.order.entry_date)}</span>
                  </div>
                </div>

                {/* Notes */}
                {(detailHistory.order.diagnostic_notes || detailHistory.order.work_notes) ? (
                  <div className={styles.notesGrid}>
                    {detailHistory.order.diagnostic_notes ? (
                      <div className={styles.noteBlock}>
                        <span className={styles.detailLabel}>Diagnóstico</span>
                        <p className={styles.noteText}>{detailHistory.order.diagnostic_notes}</p>
                      </div>
                    ) : null}
                    {detailHistory.order.work_notes ? (
                      <div className={styles.noteBlock}>
                        <span className={styles.detailLabel}>Trabajos realizados</span>
                        <ul className={styles.workLogList}>
                          {parseWorkLog(detailHistory.order.work_notes).map((entry, idx) => (
                            <li key={`${idx}-${entry}`} className={styles.noteText}>{entry}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* Services (solo lectura) */}
                <div className={styles.detailSection}>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>
                      Servicios ({detailHistory.services.length})
                    </h3>
                  </div>

                  {detailHistory.services.length > 0 ? (
                    <div className={styles.itemList}>
                      {detailHistory.services.map((svc) => (
                        <div key={svc.id} className={styles.itemRow}>
                          <div className={styles.itemInfo}>
                            <strong>{svc.service_name}</strong>
                            {svc.description
                              ? <span className={styles.itemDesc}>{svc.description}</span>
                              : null}
                            <span className={styles.itemMeta}>
                              x{svc.quantity} × {formatCurrency(svc.unit_price)} = {formatCurrency(svc.total_price)}
                              {svc.employee_name ? ` · ${svc.employee_name}` : ''}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyItems}>Sin servicios registrados.</p>
                  )}
                </div>

                {/* Parts (solo lectura) */}
                <div className={styles.detailSection}>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>
                      Repuestos ({detailHistory.parts.length})
                    </h3>
                  </div>

                  {detailHistory.parts.length > 0 ? (
                    <div className={styles.itemList}>
                      {detailHistory.parts.map((part) => (
                        <div key={part.id} className={styles.itemRow}>
                          <div className={styles.itemInfo}>
                            <strong>{part.part_name}</strong>
                            <span className={styles.itemMeta}>
                              {part.part_code} · x{part.quantity} × {formatCurrency(part.unit_price)} = {formatCurrency(part.total_price)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyItems}>Sin repuestos registrados.</p>
                  )}
                </div>

                {/* Totals */}
                <div className={styles.detailSection}>
                  <h3 className={styles.sectionTitle}>Totales</h3>
                  <div className={styles.totalsGrid}>
                    <div className={styles.totalRow}>
                      <span>Mano de obra</span>
                      <strong>{formatCurrency(detailHistory.order.labor_cost)}</strong>
                    </div>
                    <div className={styles.totalRow}>
                      <span>Repuestos</span>
                      <strong>{formatCurrency(detailHistory.order.parts_cost)}</strong>
                    </div>
                    {Number(detailHistory.order.discount) > 0 ? (
                      <div className={styles.totalRow}>
                        <span>Descuento</span>
                        <strong className={styles.discountText}>
                          − {formatCurrency(detailHistory.order.discount)}
                        </strong>
                      </div>
                    ) : null}
                    <div className={`${styles.totalRow} ${styles.totalFinal}`}>
                      <span>Total</span>
                      <strong>{formatCurrency(detailHistory.order.final_price)}</strong>
                    </div>
                  </div>
                </div>

                {/* Payment (closed orders) */}
                {detailHistory.sale ? (
                  <div className={styles.detailSection}>
                    <h3 className={styles.sectionTitle}>Información de pago</h3>
                    <div className={styles.detailGrid}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Método</span>
                        <span>{detailHistory.sale.payment_method || '—'}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Estado del pago</span>
                        <span>{detailHistory.sale.payment_status || '—'}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Total facturado</span>
                        <strong>{formatCurrency(detailHistory.sale.total_amount)}</strong>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Status history */}
                {detailHistory.status_history?.length > 0 ? (
                  <div className={styles.detailSection}>
                    <h3 className={styles.sectionTitle}>Historial de estados</h3>
                    <div className={styles.historyList}>
                      {detailHistory.status_history.map((h) => (
                        <div key={h.id} className={styles.historyItem}>
                          <span className={styles.historyArrow}>
                            {h.previous_status || '—'} → {h.new_status}
                          </span>
                          <span className={styles.historyMeta}>
                            {h.changed_by_name} · {formatDate(h.created_at)}
                          </span>
                          {h.notes ? <span className={styles.historyNotes}>{h.notes}</span> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Close action (Listo status only) */}
                {(detailHistory.order.status === 'Listo' || detailHistory.order.status === 'Lista para entrega') ? (
                  <div className={styles.detailActions}>
                    <button
                      className={styles.closeOrderBtn}
                      type="button"
                      onClick={() => { closeDetail(); openClose(detailTarget) }}
                    >
                      Cerrar orden y entregar
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {/* ── Close order modal ────────────────────────────── */}
      {closeTarget ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="close-title">
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Cierre de orden</p>
                <h2 id="close-title">Cerrar {closeTarget.order_number}</h2>
                <p>
                  Marcará la orden como <strong>Entregada</strong> y creará el registro de venta.
                  Esta acción no se puede deshacer.
                </p>
              </div>
              <button
                className={styles.iconButton}
                type="button"
                disabled={closing}
                onClick={() => setCloseTarget(null)}
              >
                ×
              </button>
            </div>
            <form className={styles.form} onSubmit={handleClose}>
              <label className={styles.formField}>
                Método de pago
                <select
                  value={closeForm.payment_method}
                  onChange={(e) => setCloseForm((p) => ({ ...p, payment_method: e.target.value }))}
                >
                  <option value="">Sin especificar</option>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>

              <label className={styles.formField}>
                Estado del pago
                <select
                  value={closeForm.payment_status}
                  onChange={(e) => setCloseForm((p) => ({ ...p, payment_status: e.target.value }))}
                >
                  {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>

              <label className={`${styles.formField} ${styles.fullWidth}`}>
                Notas de entrega (opcional)
                <textarea
                  rows={2}
                  maxLength={500}
                  placeholder="Observaciones al momento de la entrega…"
                  value={closeForm.notes}
                  onChange={(e) => setCloseForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </label>

              <div className={styles.formActions}>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  disabled={closing}
                  onClick={() => setCloseTarget(null)}
                >
                  Cancelar
                </button>
                <button className={styles.closeOrderBtn} type="submit" disabled={closing}>
                  {closing ? 'Cerrando…' : 'Confirmar entrega'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {/* ── Delete modal ─────────────────────────────────── */}
      {deleteTarget ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section className={styles.modal} role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
            <div className={styles.modalHeader}>
              <div>
                <p className={`${styles.eyebrow} ${styles.eyebrowDanger}`}>Eliminar orden</p>
                <h2 id="delete-title">¿Eliminar {deleteTarget.label}?</h2>
              </div>
              <button className={styles.iconButton} type="button" onClick={() => setDeleteTarget(null)}>×</button>
            </div>
            <p className={styles.deleteDesc}>
              Esta acción es permanente y quedará registrada en los logs del sistema.
            </p>
            <label className={styles.deleteLabel}>
              Motivo de eliminación <span className={styles.required}>*</span>
              <textarea
                className={`${styles.deleteTextarea}${deleteReasonError ? ` ${styles.textareaError}` : ''}`}
                rows={3}
                maxLength={500}
                placeholder="Describe el motivo de eliminación…"
                value={deleteReason}
                onChange={(e) => {
                  setDeleteReason(e.target.value)
                  if (deleteReasonError) setDeleteReasonError('')
                }}
              />
              {deleteReasonError
                ? <span className={styles.fieldError}>{deleteReasonError}</span>
                : null}
            </label>
            <div className={styles.deleteActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </button>
              <button
                className={styles.dangerButton}
                type="button"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? 'Eliminando…' : 'Eliminar permanentemente'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {/* ── WhatsApp confirmation after create ───────────── */}
      {whatsappOrder ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="wa-title">
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Orden creada</p>
                <h2 id="wa-title">{whatsappOrder.order_number}</h2>
              </div>
              <button className={styles.iconButton} type="button" onClick={() => setWhatsappOrder(null)}>×</button>
            </div>
            <div className={styles.waBody}>
              <div className={styles.waCheck}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="32" height="32">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                </svg>
              </div>
              <p className={styles.waText}>
                La orden para <strong>{whatsappOrder.motorcycle_brand} {whatsappOrder.motorcycle_plate}</strong> fue creada exitosamente.
              </p>
              <p className={styles.waSubtext}>
                ¿Deseas notificar al cliente <strong>{whatsappOrder.client_name}</strong> por WhatsApp con el enlace de seguimiento?
              </p>
              <div className={styles.waTrackingUrl}>
                {TRACKING_BASE_URL}/{whatsappOrder.tracking_token}
              </div>
            </div>
            <div className={styles.waActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => setWhatsappOrder(null)}
              >
                Omitir
              </button>
              <a
                className={styles.waButton}
                href={buildWhatsAppUrl(whatsappOrder)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setWhatsappOrder(null)}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                Enviar por WhatsApp
              </a>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}

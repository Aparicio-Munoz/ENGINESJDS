import { useEffect, useMemo, useState } from 'react'
import { getClients } from '../../../services/clientsService'
import { getEmployees } from '../../../services/employeesService'
import { getInventory } from '../../../services/inventoryService'
import { getMotorcycles } from '../../../services/motorcyclesService'
import { getOrders, saveOrders } from '../../../services/ordersService'
import styles from './OrdenesTrabajo.module.css'

const ORDER_STATUSES = [
  'Recibida',
  'Diagnóstico',
  'En reparación',
  'Lista para entrega',
  'Entregada',
]

const STATUS_STYLES = {
  'Recibida':           { background: '#dbeafe', color: '#1d4ed8' },
  'Diagnóstico':        { background: '#fef3c7', color: '#92400e' },
  'En reparación':      { background: '#ffedd5', color: '#9a3412' },
  'Lista para entrega': { background: '#ede9fe', color: '#6d28d9' },
  'Entregada':          { background: '#d1fae5', color: '#047857' },
}

const initialOrders = [
  {
    id: 'ot-001',
    orderNumber: 'OT-2026-001',
    clientName: 'Carlos Ramirez',
    motorcycle: 'JDS12E - Yamaha FZ 2.0',
    mileage: '12500',
    faultDescription: 'El motor no enciende al primer intento.',
    entryDate: '1/6/2026',
    status: 'En reparación',
  },
  {
    id: 'ot-002',
    orderNumber: 'OT-2026-002',
    clientName: 'Laura Gomez',
    motorcycle: 'KTM89F - KTM Duke',
    mileage: '8300',
    faultDescription: 'Freno trasero sin respuesta.',
    entryDate: '5/6/2026',
    status: 'Diagnóstico',
  },
  {
    id: 'ot-003',
    orderNumber: 'OT-2026-003',
    clientName: 'Andres Torres',
    motorcycle: 'HON45A - Honda CB 190R',
    mileage: '22100',
    faultDescription: 'Cambio de aceite y revision general.',
    entryDate: '9/6/2026',
    status: 'Recibida',
  },
]

const initialFormData = {
  clientName: '',
  motorcycle: '',
  assignedEmployee: '',
  repuestoId: '',
  mileage: '',
  faultDescription: '',
  status: 'Recibida',
}

function findRepuestoId(repuestoString, inventory) {
  if (!repuestoString) return ''
  const item = inventory.find((i) => `${i.code} - ${i.name}` === repuestoString)
  return item ? item.id : ''
}

function generateOrderNumber(orders) {
  const year = new Date().getFullYear()
  const max = orders.reduce((acc, order) => {
    const n = Number(order.orderNumber.split('-')[2]) || 0
    return Math.max(acc, n)
  }, 0)
  return `OT-${year}-${String(max + 1).padStart(3, '0')}`
}

function validateOrder(formData) {
  const errors = {}

  if (!formData.clientName.trim()) {
    errors.clientName = 'El cliente es obligatorio.'
  }

  if (!formData.motorcycle.trim()) {
    errors.motorcycle = 'La motocicleta es obligatoria.'
  }

  if (!formData.mileage.trim()) {
    errors.mileage = 'El kilometraje es obligatorio.'
  } else if (!/^\d{1,7}$/.test(formData.mileage.trim())) {
    errors.mileage = 'Ingresa un kilometraje valido (solo digitos, max 7).'
  }

  if (!formData.faultDescription.trim()) {
    errors.faultDescription = 'La descripcion de falla es obligatoria.'
  } else if (formData.faultDescription.trim().length < 10) {
    errors.faultDescription = 'Describe la falla con al menos 10 caracteres.'
  }

  return errors
}

export function OrdenesTrabajo() {
  const [orders, setOrders] = useState(() => getOrders(initialOrders))
  const [formData, setFormData] = useState(initialFormData)
  const [errors, setErrors] = useState({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingOrderId, setEditingOrderId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterEmployee, setFilterEmployee] = useState('')

  useEffect(() => {
    saveOrders(orders)
  }, [orders])

  const clients = useMemo(() => getClients([]), [])
  const motorcycles = useMemo(() => getMotorcycles([]), [])
  const employees = useMemo(() => getEmployees([]), [])
  const inventory = useMemo(() => getInventory([]), [])

  const inProgressCount = useMemo(
    () => orders.filter((order) => order.status !== 'Entregada').length,
    [orders],
  )

  const employeeOptions = useMemo(() => {
    const set = new Set(orders.map((o) => o.assignedEmployee).filter(Boolean))
    return [...set].sort()
  }, [orders])

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = searchQuery.toLowerCase().trim()
      const matchSearch = !q || o.orderNumber.toLowerCase().includes(q)
      const matchStatus = !filterStatus || o.status === filterStatus
      const matchEmployee = !filterEmployee || o.assignedEmployee === filterEmployee
      return matchSearch && matchStatus && matchEmployee
    })
  }, [orders, searchQuery, filterStatus, filterEmployee])

  function openModal() {
    setErrors({})
    setEditingOrderId(null)
    setFormData(initialFormData)
    setIsModalOpen(true)
  }

  function openEditModal(order) {
    setErrors({})
    setEditingOrderId(order.id)
    setFormData({
      clientName: order.clientName || '',
      motorcycle: order.motorcycle || '',
      assignedEmployee: order.assignedEmployee || '',
      repuestoId: findRepuestoId(order.repuesto, inventory),
      mileage: order.mileage || '',
      faultDescription: order.faultDescription || '',
      status: order.status || 'Recibida',
    })
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingOrderId(null)
    setErrors({})
  }

  function handleInputChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  function handleCreateOrder(event) {
    event.preventDefault()

    const validationErrors = validateOrder(formData)

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    const selectedItem = inventory.find((i) => i.id === formData.repuestoId)

    const nextOrder = {
      id: crypto.randomUUID(),
      orderNumber: generateOrderNumber(orders),
      clientName: formData.clientName.trim(),
      motorcycle: formData.motorcycle.trim(),
      assignedEmployee: formData.assignedEmployee.trim(),
      repuesto: selectedItem ? `${selectedItem.code} - ${selectedItem.name}` : '',
      costoEstimado: selectedItem ? selectedItem.price : '',
      mileage: formData.mileage.trim(),
      faultDescription: formData.faultDescription.trim(),
      entryDate: new Date().toLocaleDateString('es-CO'),
      status: 'Recibida',
    }

    setOrders((current) => [nextOrder, ...current])
    closeModal()
  }

  function handleUpdateOrder(event) {
    event.preventDefault()

    const validationErrors = validateOrder(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    const selectedItem = inventory.find((i) => i.id === formData.repuestoId)

    setOrders((current) =>
      current.map((order) =>
        order.id === editingOrderId
          ? {
              ...order,
              clientName: formData.clientName.trim(),
              motorcycle: formData.motorcycle.trim(),
              assignedEmployee: formData.assignedEmployee.trim(),
              repuesto: selectedItem ? `${selectedItem.code} - ${selectedItem.name}` : '',
              costoEstimado: selectedItem ? selectedItem.price : '',
              mileage: formData.mileage.trim(),
              faultDescription: formData.faultDescription.trim(),
              status: formData.status,
            }
          : order,
      ),
    )
    closeModal()
  }

  function handleChangeStatus(orderId, newStatus) {
    setOrders((current) =>
      current.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order)),
    )
  }

  function handleDeleteOrder(orderId) {
    setOrders((current) => current.filter((order) => order.id !== orderId))
  }

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Modulo administrativo</p>
          <h1>Órdenes de Trabajo</h1>
          <p>Registro local de ordenes preparado para conectarse con una API REST.</p>
        </div>

        <button className={styles.primaryButton} type="button" onClick={openModal}>
          Nueva orden
        </button>
      </div>

      <div className={styles.summaryBar}>
        <span>
          {searchQuery || filterStatus || filterEmployee
            ? `${filteredOrders.length} de ${orders.length} ordenes`
            : `${orders.length} ordenes registradas`}
        </span>
        <span>{inProgressCount} en proceso</span>
      </div>

      <div className={styles.searchBar}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Buscar por número OT..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={filterEmployee}
          onChange={(e) => setFilterEmployee(e.target.value)}
        >
          <option value="">Todos los empleados</option>
          {employeeOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Número OT</th>
              <th>Cliente</th>
              <th>Motocicleta</th>
              <th>Empleado</th>
              <th>Repuesto</th>
              <th>Costo</th>
              <th>Fecha ingreso</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id}>
                <td data-label="Número OT">
                  <span className={styles.orderNumber}>{order.orderNumber}</span>
                </td>
                <td data-label="Cliente">{order.clientName}</td>
                <td data-label="Motocicleta">{order.motorcycle}</td>
                <td data-label="Empleado">{order.assignedEmployee || '—'}</td>
                <td data-label="Repuesto">{order.repuesto || '—'}</td>
                <td data-label="Costo">
                  {order.costoEstimado
                    ? `$ ${Number(order.costoEstimado).toLocaleString('es-CO')}`
                    : '—'}
                </td>
                <td data-label="Fecha ingreso">{order.entryDate}</td>
                <td data-label="Estado">
                  <select
                    className={styles.statusSelect}
                    style={STATUS_STYLES[order.status] ?? {}}
                    value={order.status}
                    onChange={(e) => handleChangeStatus(order.id, e.target.value)}
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td data-label="Acciones">
                  <button
                    className={styles.editButton}
                    type="button"
                    onClick={() => openEditModal(order)}
                  >
                    Editar
                  </button>
                  <button
                    className={styles.deleteButton}
                    type="button"
                    onClick={() => handleDeleteOrder(order.id)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.emptyState}>
                  {searchQuery || filterStatus || filterEmployee
                    ? 'Sin resultados para los filtros aplicados'
                    : 'No hay órdenes registradas aún'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {isModalOpen ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            aria-labelledby="order-modal-title"
            className={styles.modal}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>{editingOrderId ? 'Edicion' : 'Registro'}</p>
                <h2 id="order-modal-title">
                  {editingOrderId ? 'Editar orden de trabajo' : 'Nueva orden de trabajo'}
                </h2>
              </div>
              <button className={styles.iconButton} type="button" onClick={closeModal}>
                X
              </button>
            </div>

            <form
              className={styles.form}
              onSubmit={editingOrderId ? handleUpdateOrder : handleCreateOrder}
            >
              <label className={styles.formField}>
                Cliente
                <select name="clientName" value={formData.clientName} onChange={handleInputChange}>
                  <option value="">Selecciona un cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.clientName ? <span>{errors.clientName}</span> : null}
              </label>

              <label className={styles.formField}>
                Motocicleta
                <select name="motorcycle" value={formData.motorcycle} onChange={handleInputChange}>
                  <option value="">Selecciona una motocicleta</option>
                  {motorcycles.map((m) => (
                    <option key={m.id} value={`${m.plate} - ${m.brand} ${m.model}`}>
                      {m.plate} — {m.brand} {m.model}
                    </option>
                  ))}
                </select>
                {errors.motorcycle ? <span>{errors.motorcycle}</span> : null}
              </label>

              <label className={styles.formField}>
                Empleado asignado
                <select
                  name="assignedEmployee"
                  value={formData.assignedEmployee}
                  onChange={handleInputChange}
                >
                  <option value="">Sin asignar</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.name}>
                      {e.name} — {e.specialty}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.formField}>
                Repuesto principal
                <select
                  name="repuestoId"
                  value={formData.repuestoId}
                  onChange={handleInputChange}
                >
                  <option value="">Sin repuesto</option>
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} — {item.name} ($ {Number(item.price).toLocaleString('es-CO')})
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.formField}>
                Kilometraje
                <input
                  inputMode="numeric"
                  name="mileage"
                  value={formData.mileage}
                  onChange={handleInputChange}
                  placeholder="12500"
                />
                {errors.mileage ? <span>{errors.mileage}</span> : null}
              </label>

              <label className={`${styles.formField} ${styles.fullWidth}`}>
                Descripcion de falla
                <textarea
                  name="faultDescription"
                  value={formData.faultDescription}
                  onChange={handleInputChange}
                  placeholder="Describe el problema que presenta la motocicleta..."
                  rows={3}
                />
                {errors.faultDescription ? <span>{errors.faultDescription}</span> : null}
              </label>

              {editingOrderId ? (
                <label className={styles.formField}>
                  Estado
                  <select name="status" value={formData.status} onChange={handleInputChange}>
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className={styles.formActions}>
                <button className={styles.secondaryButton} type="button" onClick={closeModal}>
                  Cancelar
                </button>
                <button className={styles.primaryButton} type="submit">
                  {editingOrderId ? 'Guardar cambios' : 'Guardar orden'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}

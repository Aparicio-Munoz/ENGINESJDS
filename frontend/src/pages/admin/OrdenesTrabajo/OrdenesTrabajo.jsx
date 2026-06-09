import { useEffect, useMemo, useState } from 'react'
import { getOrders, saveOrders } from '../../../services/ordersService'
import styles from './OrdenesTrabajo.module.css'

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
  mileage: '',
  faultDescription: '',
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

  useEffect(() => {
    saveOrders(orders)
  }, [orders])

  const inProgressCount = useMemo(
    () => orders.filter((order) => order.status !== 'Entregada').length,
    [orders],
  )

  function openModal() {
    setErrors({})
    setFormData(initialFormData)
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
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

    const nextOrder = {
      id: crypto.randomUUID(),
      orderNumber: generateOrderNumber(orders),
      clientName: formData.clientName.trim(),
      motorcycle: formData.motorcycle.trim(),
      mileage: formData.mileage.trim(),
      faultDescription: formData.faultDescription.trim(),
      entryDate: new Date().toLocaleDateString('es-CO'),
      status: 'Recibida',
    }

    setOrders((current) => [nextOrder, ...current])
    closeModal()
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
        <span>{orders.length} ordenes registradas</span>
        <span>{inProgressCount} en proceso</span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Número OT</th>
              <th>Cliente</th>
              <th>Motocicleta</th>
              <th>Fecha ingreso</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td data-label="Número OT">
                  <span className={styles.orderNumber}>{order.orderNumber}</span>
                </td>
                <td data-label="Cliente">{order.clientName}</td>
                <td data-label="Motocicleta">{order.motorcycle}</td>
                <td data-label="Fecha ingreso">{order.entryDate}</td>
                <td data-label="Estado">
                  <span className={styles.statusBadge} data-status={order.status}>
                    {order.status}
                  </span>
                </td>
                <td data-label="Acciones">
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
                <p className={styles.eyebrow}>Registro</p>
                <h2 id="order-modal-title">Nueva orden de trabajo</h2>
              </div>
              <button className={styles.iconButton} type="button" onClick={closeModal}>
                X
              </button>
            </div>

            <form className={styles.form} onSubmit={handleCreateOrder}>
              <label className={styles.formField}>
                Cliente
                <input
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleInputChange}
                  placeholder="Nombre del cliente"
                />
                {errors.clientName ? <span>{errors.clientName}</span> : null}
              </label>

              <label className={styles.formField}>
                Motocicleta
                <input
                  name="motorcycle"
                  value={formData.motorcycle}
                  onChange={handleInputChange}
                  placeholder="JDS12E - Yamaha FZ 2.0"
                />
                {errors.motorcycle ? <span>{errors.motorcycle}</span> : null}
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

              <div className={styles.formActions}>
                <button className={styles.secondaryButton} type="button" onClick={closeModal}>
                  Cancelar
                </button>
                <button className={styles.primaryButton} type="submit">
                  Guardar orden
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}

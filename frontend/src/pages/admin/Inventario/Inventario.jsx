import { useEffect, useMemo, useState } from 'react'
import { getInventory, saveInventory } from '../../../services/inventoryService'
import { ConfirmModal } from '../../../components/ConfirmModal/ConfirmModal'
import styles from './Inventario.module.css'

const initialItems = [
  {
    id: 'inv-001',
    code: 'REP-001',
    name: 'Filtro de aceite',
    brand: 'Purolator',
    quantity: 12,
    price: '18000',
    status: 'Disponible',
  },
  {
    id: 'inv-002',
    code: 'REP-002',
    name: 'Pastillas de freno',
    brand: 'EBC',
    quantity: 4,
    price: '45000',
    status: 'Stock bajo',
  },
  {
    id: 'inv-003',
    code: 'REP-003',
    name: 'Bujia iridium',
    brand: 'NGK',
    quantity: 0,
    price: '12000',
    status: 'Agotado',
  },
]

const initialFormData = {
  code: '',
  name: '',
  brand: '',
  quantity: '',
  price: '',
}

function deriveStatus(quantity) {
  if (quantity === 0) return 'Agotado'
  if (quantity <= 5) return 'Stock bajo'
  return 'Disponible'
}

function validateItem(formData, items) {
  const errors = {}
  const code = formData.code.trim().toUpperCase()
  const quantity = Number(formData.quantity)
  const price = Number(formData.price)

  if (!code) {
    errors.code = 'El codigo es obligatorio.'
  } else if (!/^[A-Z0-9-]{3,15}$/.test(code)) {
    errors.code = 'Usa entre 3 y 15 caracteres alfanumericos o guiones.'
  } else if (items.some((item) => item.code === code)) {
    errors.code = 'Ya existe un repuesto con este codigo.'
  }

  if (!formData.name.trim()) {
    errors.name = 'El nombre es obligatorio.'
  }

  if (!formData.brand.trim()) {
    errors.brand = 'La marca es obligatoria.'
  }

  if (!formData.quantity.trim()) {
    errors.quantity = 'La cantidad es obligatoria.'
  } else if (!Number.isInteger(quantity) || quantity < 0) {
    errors.quantity = 'Ingresa una cantidad entera mayor o igual a 0.'
  }

  if (!formData.price.trim()) {
    errors.price = 'El precio es obligatorio.'
  } else if (!/^\d{1,10}$/.test(formData.price.trim()) || price <= 0) {
    errors.price = 'Ingresa un precio valido en pesos (solo digitos, mayor a 0).'
  }

  return errors
}

export function Inventario() {
  const [items, setItems] = useState(() => getInventory(initialItems))
  const [formData, setFormData] = useState(initialFormData)
  const [errors, setErrors] = useState({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    saveInventory(items)
  }, [items])

  const lowStockCount = useMemo(
    () => items.filter((item) => item.status === 'Stock bajo').length,
    [items],
  )

  const outOfStockCount = useMemo(
    () => items.filter((item) => item.status === 'Agotado').length,
    [items],
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

  function handleCreateItem(event) {
    event.preventDefault()

    const validationErrors = validateItem(formData, items)

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    const quantity = Number(formData.quantity.trim())

    const nextItem = {
      id: crypto.randomUUID(),
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      brand: formData.brand.trim(),
      quantity,
      price: formData.price.trim(),
      status: deriveStatus(quantity),
    }

    setItems((current) => [nextItem, ...current])
    closeModal()
  }

  function handleDeleteItem(itemId, label) {
    setDeleteTarget({ id: itemId, label })
  }

  function handleConfirmDelete() {
    setItems((current) => current.filter((item) => item.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Modulo administrativo</p>
          <h1>Inventario</h1>
          <p>Registro local de repuestos preparado para conectarse con una API REST.</p>
        </div>

        <button className={styles.primaryButton} type="button" onClick={openModal}>
          Nuevo repuesto
        </button>
      </div>

      <div className={styles.summaryBar}>
        <span>{items.length} repuestos registrados</span>
        <span>{lowStockCount} con stock bajo</span>
        <span>{outOfStockCount} agotados</span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Marca</th>
              <th>Cantidad</th>
              <th>Precio unitario</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td data-label="Código">
                  <span className={styles.itemCode}>{item.code}</span>
                </td>
                <td data-label="Nombre">{item.name}</td>
                <td data-label="Marca">{item.brand}</td>
                <td data-label="Cantidad">
                  <span className={styles.quantity}>{item.quantity}</span>
                </td>
                <td data-label="Precio unitario">
                  <span className={styles.price}>
                    $ {Number(item.price).toLocaleString('es-CO')}
                  </span>
                </td>
                <td data-label="Estado">
                  <span className={styles.statusBadge} data-status={item.status}>
                    {item.status}
                  </span>
                </td>
                <td data-label="Acciones">
                  <button
                    className={styles.deleteButton}
                    type="button"
                    onClick={() => handleDeleteItem(item.id, `${item.code} — ${item.name}`)}
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
            aria-labelledby="inventory-modal-title"
            className={styles.modal}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Registro</p>
                <h2 id="inventory-modal-title">Nuevo repuesto</h2>
              </div>
              <button className={styles.iconButton} type="button" onClick={closeModal}>
                X
              </button>
            </div>

            <form className={styles.form} onSubmit={handleCreateItem}>
              <label className={styles.formField}>
                Código
                <input
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="REP-004"
                />
                {errors.code ? <span>{errors.code}</span> : null}
              </label>

              <label className={styles.formField}>
                Marca
                <input
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  placeholder="NGK"
                />
                {errors.brand ? <span>{errors.brand}</span> : null}
              </label>

              <label className={`${styles.formField} ${styles.fullWidth}`}>
                Nombre del repuesto
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Filtro de aceite"
                />
                {errors.name ? <span>{errors.name}</span> : null}
              </label>

              <label className={styles.formField}>
                Cantidad
                <input
                  inputMode="numeric"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="10"
                />
                {errors.quantity ? <span>{errors.quantity}</span> : null}
              </label>

              <label className={styles.formField}>
                Precio unitario (COP)
                <input
                  inputMode="numeric"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="18000"
                />
                {errors.price ? <span>{errors.price}</span> : null}
              </label>

              <div className={styles.formActions}>
                <button className={styles.secondaryButton} type="button" onClick={closeModal}>
                  Cancelar
                </button>
                <button className={styles.primaryButton} type="submit">
                  Guardar repuesto
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        entityLabel={deleteTarget?.label ?? ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  )
}

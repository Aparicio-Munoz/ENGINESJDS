import { useEffect, useMemo, useState } from 'react'
import { getMotorcycles, saveMotorcycles } from '../../../services/motorcyclesService'
import styles from './Motocicletas.module.css'

const initialMotorcycles = [
  {
    id: 'moto-001',
    plate: 'JDS12E',
    brand: 'Yamaha',
    model: 'FZ 2.0',
    year: '2021',
    engineSize: '150 cc',
    ownerName: 'Carlos Ramirez',
    ownerPhone: '3001234567',
    status: 'Activa',
  },
  {
    id: 'moto-002',
    plate: 'KTM89F',
    brand: 'KTM',
    model: 'Duke',
    year: '2020',
    engineSize: '200 cc',
    ownerName: 'Laura Gomez',
    ownerPhone: '3109876543',
    status: 'En servicio',
  },
  {
    id: 'moto-003',
    plate: 'HON45A',
    brand: 'Honda',
    model: 'CB 190R',
    year: '2022',
    engineSize: '190 cc',
    ownerName: 'Andres Torres',
    ownerPhone: '3154567890',
    status: 'Activa',
  },
]

const initialFormData = {
  plate: '',
  brand: '',
  model: '',
  year: '',
  engineSize: '',
  ownerName: '',
  ownerPhone: '',
}

function normalizePlate(plate) {
  return plate.trim().toUpperCase()
}

function validateMotorcycle(formData, motorcycles) {
  const errors = {}
  const plate = normalizePlate(formData.plate)
  const year = Number(formData.year)

  if (!plate) {
    errors.plate = 'La placa es obligatoria.'
  } else if (!/^[A-Z0-9]{5,7}$/.test(plate)) {
    errors.plate = 'Usa entre 5 y 7 caracteres alfanumericos.'
  } else if (motorcycles.some((motorcycle) => motorcycle.plate === plate)) {
    errors.plate = 'Ya existe una motocicleta con esta placa.'
  }

  if (!formData.brand.trim()) {
    errors.brand = 'La marca es obligatoria.'
  }

  if (!formData.model.trim()) {
    errors.model = 'El modelo es obligatorio.'
  }

  if (!formData.year.trim()) {
    errors.year = 'El ano es obligatorio.'
  } else if (!Number.isInteger(year) || year < 1990 || year > new Date().getFullYear() + 1) {
    errors.year = 'Ingresa un ano valido.'
  }

  if (!formData.engineSize.trim()) {
    errors.engineSize = 'El cilindraje es obligatorio.'
  }

  if (!formData.ownerName.trim()) {
    errors.ownerName = 'El propietario es obligatorio.'
  }

  if (!formData.ownerPhone.trim()) {
    errors.ownerPhone = 'El telefono es obligatorio.'
  } else if (!/^\d{7,12}$/.test(formData.ownerPhone.trim())) {
    errors.ownerPhone = 'Ingresa un telefono entre 7 y 12 digitos.'
  }

  return errors
}

export function Motocicletas() {
  const [motorcycles, setMotorcycles] = useState(() => getMotorcycles(initialMotorcycles))
  const [formData, setFormData] = useState(initialFormData)
  const [errors, setErrors] = useState({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    saveMotorcycles(motorcycles)
  }, [motorcycles])

  const totalInService = useMemo(
    () => motorcycles.filter((motorcycle) => motorcycle.status === 'En servicio').length,
    [motorcycles],
  )

  const filteredMotorcycles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return motorcycles
    return motorcycles.filter(
      (m) => m.plate.toLowerCase().includes(q) || m.brand.toLowerCase().includes(q),
    )
  }, [motorcycles, searchQuery])

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

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }))
  }

  function handleCreateMotorcycle(event) {
    event.preventDefault()

    const validationErrors = validateMotorcycle(formData, motorcycles)

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    const nextMotorcycle = {
      id: crypto.randomUUID(),
      plate: normalizePlate(formData.plate),
      brand: formData.brand.trim(),
      model: formData.model.trim(),
      year: formData.year.trim(),
      engineSize: formData.engineSize.trim(),
      ownerName: formData.ownerName.trim(),
      ownerPhone: formData.ownerPhone.trim(),
      status: 'Activa',
    }

    setMotorcycles((currentMotorcycles) => [nextMotorcycle, ...currentMotorcycles])
    closeModal()
  }

  function handleDeleteMotorcycle(motorcycleId) {
    setMotorcycles((currentMotorcycles) =>
      currentMotorcycles.filter((motorcycle) => motorcycle.id !== motorcycleId),
    )
  }

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Modulo administrativo</p>
          <h1>Motocicletas</h1>
          <p>
            Registro local de motocicletas preparado para conectarse con una API REST.
          </p>
        </div>

        <button className={styles.primaryButton} type="button" onClick={openModal}>
          Nueva motocicleta
        </button>
      </div>

      <div className={styles.summaryBar}>
        <span>
          {searchQuery
            ? `${filteredMotorcycles.length} de ${motorcycles.length} motocicletas`
            : `${motorcycles.length} motocicletas registradas`}
        </span>
        <span>{totalInService} en servicio</span>
      </div>

      <div className={styles.searchBar}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Buscar por placa o marca..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Placa</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Cilindraje</th>
              <th>Propietario</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredMotorcycles.map((motorcycle) => (
              <tr key={motorcycle.id}>
                <td data-label="Placa">{motorcycle.plate}</td>
                <td data-label="Marca">{motorcycle.brand}</td>
                <td data-label="Modelo">
                  {motorcycle.model} {motorcycle.year}
                </td>
                <td data-label="Cilindraje">{motorcycle.engineSize}</td>
                <td data-label="Propietario">
                  <span className={styles.ownerName}>{motorcycle.ownerName}</span>
                  <span className={styles.ownerPhone}>{motorcycle.ownerPhone}</span>
                </td>
                <td data-label="Estado">
                  <span className={styles.statusBadge}>{motorcycle.status}</span>
                </td>
                <td data-label="Acciones">
                  <button
                    className={styles.deleteButton}
                    type="button"
                    onClick={() => handleDeleteMotorcycle(motorcycle.id)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {filteredMotorcycles.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyState}>
                  {searchQuery
                    ? `Sin resultados para "${searchQuery.trim()}"`
                    : 'No hay motocicletas registradas aún'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {isModalOpen ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            aria-labelledby="motorcycle-modal-title"
            className={styles.modal}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Registro</p>
                <h2 id="motorcycle-modal-title">Nueva motocicleta</h2>
              </div>
              <button className={styles.iconButton} type="button" onClick={closeModal}>
                X
              </button>
            </div>

            <form className={styles.form} onSubmit={handleCreateMotorcycle}>
              <label className={styles.formField}>
                Placa
                <input
                  name="plate"
                  value={formData.plate}
                  onChange={handleInputChange}
                  placeholder="ABC12D"
                />
                {errors.plate ? <span>{errors.plate}</span> : null}
              </label>

              <label className={styles.formField}>
                Marca
                <input
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  placeholder="Yamaha"
                />
                {errors.brand ? <span>{errors.brand}</span> : null}
              </label>

              <label className={styles.formField}>
                Modelo
                <input
                  name="model"
                  value={formData.model}
                  onChange={handleInputChange}
                  placeholder="FZ 2.0"
                />
                {errors.model ? <span>{errors.model}</span> : null}
              </label>

              <label className={styles.formField}>
                Ano
                <input
                  inputMode="numeric"
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  placeholder="2024"
                />
                {errors.year ? <span>{errors.year}</span> : null}
              </label>

              <label className={styles.formField}>
                Cilindraje
                <input
                  name="engineSize"
                  value={formData.engineSize}
                  onChange={handleInputChange}
                  placeholder="150 cc"
                />
                {errors.engineSize ? <span>{errors.engineSize}</span> : null}
              </label>

              <label className={styles.formField}>
                Propietario
                <input
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleInputChange}
                  placeholder="Nombre completo"
                />
                {errors.ownerName ? <span>{errors.ownerName}</span> : null}
              </label>

              <label className={styles.formField}>
                Telefono
                <input
                  inputMode="tel"
                  name="ownerPhone"
                  value={formData.ownerPhone}
                  onChange={handleInputChange}
                  placeholder="3001234567"
                />
                {errors.ownerPhone ? <span>{errors.ownerPhone}</span> : null}
              </label>

              <div className={styles.formActions}>
                <button className={styles.secondaryButton} type="button" onClick={closeModal}>
                  Cancelar
                </button>
                <button className={styles.primaryButton} type="submit">
                  Guardar motocicleta
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}

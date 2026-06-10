import { useEffect, useMemo, useState } from 'react'
import { getClients, saveClients } from '../../../services/clientsService'
import styles from './Clientes.module.css'

const initialClients = [
  {
    id: 'cli-001',
    name: 'Carlos Ramirez',
    document: '1020304050',
    phone: '3001234567',
    email: 'carlos.ramirez@email.com',
    address: 'Cra 5 # 12-34, Bogota',
  },
  {
    id: 'cli-002',
    name: 'Laura Gomez',
    document: '1030405060',
    phone: '3109876543',
    email: 'laura.gomez@email.com',
    address: 'Cl 80 # 45-67, Medellin',
  },
  {
    id: 'cli-003',
    name: 'Andres Torres',
    document: '1040506070',
    phone: '3154567890',
    email: 'andres.torres@email.com',
    address: 'Av 30 # 55-10, Cali',
  },
]

const initialFormData = {
  name: '',
  document: '',
  phone: '',
  email: '',
  address: '',
}

function validateClient(formData, clients) {
  const errors = {}
  const document = formData.document.trim()

  if (!formData.name.trim()) {
    errors.name = 'El nombre es obligatorio.'
  }

  if (!document) {
    errors.document = 'El documento es obligatorio.'
  } else if (!/^\d{6,12}$/.test(document)) {
    errors.document = 'Ingresa entre 6 y 12 digitos.'
  } else if (clients.some((client) => client.document === document)) {
    errors.document = 'Ya existe un cliente con este documento.'
  }

  if (!formData.phone.trim()) {
    errors.phone = 'El telefono es obligatorio.'
  } else if (!/^\d{7,12}$/.test(formData.phone.trim())) {
    errors.phone = 'Ingresa un telefono entre 7 y 12 digitos.'
  }

  if (!formData.email.trim()) {
    errors.email = 'El correo es obligatorio.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
    errors.email = 'Ingresa un correo valido.'
  }

  if (!formData.address.trim()) {
    errors.address = 'La direccion es obligatoria.'
  }

  return errors
}

export function Clientes() {
  const [clients, setClients] = useState(() => getClients(initialClients))
  const [formData, setFormData] = useState(initialFormData)
  const [errors, setErrors] = useState({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    saveClients(clients)
  }, [clients])

  const totalClients = useMemo(() => clients.length, [clients])

  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return clients
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.document.includes(q),
    )
  }, [clients, searchQuery])

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

  function handleCreateClient(event) {
    event.preventDefault()

    const validationErrors = validateClient(formData, clients)

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    const nextClient = {
      id: crypto.randomUUID(),
      name: formData.name.trim(),
      document: formData.document.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      address: formData.address.trim(),
    }

    setClients((current) => [nextClient, ...current])
    closeModal()
  }

  function handleDeleteClient(clientId) {
    setClients((current) => current.filter((client) => client.id !== clientId))
  }

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Modulo administrativo</p>
          <h1>Clientes</h1>
          <p>Registro local de clientes preparado para conectarse con una API REST.</p>
        </div>

        <button className={styles.primaryButton} type="button" onClick={openModal}>
          Nuevo cliente
        </button>
      </div>

      <div className={styles.summaryBar}>
        <span>
          {searchQuery
            ? `${filteredClients.length} de ${totalClients} clientes`
            : `${totalClients} clientes registrados`}
        </span>
      </div>

      <div className={styles.searchBar}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Buscar por nombre o documento..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Documento</th>
              <th>Telefono</th>
              <th>Correo</th>
              <th>Direccion</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client) => (
              <tr key={client.id}>
                <td data-label="Nombre">
                  <span className={styles.clientName}>{client.name}</span>
                </td>
                <td data-label="Documento">{client.document}</td>
                <td data-label="Telefono">{client.phone}</td>
                <td data-label="Correo">{client.email}</td>
                <td data-label="Direccion">{client.address}</td>
                <td data-label="Acciones">
                  <button
                    className={styles.deleteButton}
                    type="button"
                    onClick={() => handleDeleteClient(client.id)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyState}>
                  {searchQuery
                    ? `Sin resultados para "${searchQuery.trim()}"`
                    : 'No hay clientes registrados aún'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

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
              <button className={styles.iconButton} type="button" onClick={closeModal}>
                X
              </button>
            </div>

            <form className={styles.form} onSubmit={handleCreateClient}>
              <label className={styles.formField}>
                Nombre completo
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Carlos Ramirez"
                />
                {errors.name ? <span>{errors.name}</span> : null}
              </label>

              <label className={styles.formField}>
                Cedula / Documento
                <input
                  inputMode="numeric"
                  name="document"
                  value={formData.document}
                  onChange={handleInputChange}
                  placeholder="1020304050"
                />
                {errors.document ? <span>{errors.document}</span> : null}
              </label>

              <label className={styles.formField}>
                Telefono
                <input
                  inputMode="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="3001234567"
                />
                {errors.phone ? <span>{errors.phone}</span> : null}
              </label>

              <label className={styles.formField}>
                Correo electronico
                <input
                  inputMode="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="correo@email.com"
                />
                {errors.email ? <span>{errors.email}</span> : null}
              </label>

              <label className={`${styles.formField} ${styles.fullWidth}`}>
                Direccion
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Cra 5 # 12-34, Ciudad"
                />
                {errors.address ? <span>{errors.address}</span> : null}
              </label>

              <div className={styles.formActions}>
                <button className={styles.secondaryButton} type="button" onClick={closeModal}>
                  Cancelar
                </button>
                <button className={styles.primaryButton} type="submit">
                  Guardar cliente
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}

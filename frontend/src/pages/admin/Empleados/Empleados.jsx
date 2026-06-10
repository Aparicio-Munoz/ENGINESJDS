import { useEffect, useMemo, useState } from 'react'
import { getEmployees, saveEmployees } from '../../../services/employeesService'
import { ConfirmModal } from '../../../components/ConfirmModal/ConfirmModal'
import styles from './Empleados.module.css'

const STATUSES = ['Activo', 'Inactivo', 'Vacaciones']

const initialEmployees = [
  {
    id: 'emp-001',
    document: '80123456',
    name: 'Jorge Perez',
    phone: '3001112233',
    email: 'jorge.perez@enginesjds.com',
    specialty: 'Mecánica general',
    status: 'Activo',
  },
  {
    id: 'emp-002',
    document: '52345678',
    name: 'Maria Lopez',
    phone: '3114445566',
    email: 'maria.lopez@enginesjds.com',
    specialty: 'Electricidad',
    status: 'Activo',
  },
  {
    id: 'emp-003',
    document: '43210987',
    name: 'Luis Hernandez',
    phone: '3207778899',
    email: 'luis.hernandez@enginesjds.com',
    specialty: 'Diagnóstico',
    status: 'Vacaciones',
  },
]

const initialFormData = {
  document: '',
  name: '',
  phone: '',
  email: '',
  specialty: '',
  status: 'Activo',
}

function validateEmployee(formData, employees) {
  const errors = {}
  const document = formData.document.trim()

  if (!document) {
    errors.document = 'El documento es obligatorio.'
  } else if (!/^\d{6,12}$/.test(document)) {
    errors.document = 'Ingresa entre 6 y 12 digitos.'
  } else if (employees.some((emp) => emp.document === document)) {
    errors.document = 'Ya existe un empleado con este documento.'
  }

  if (!formData.name.trim()) {
    errors.name = 'El nombre es obligatorio.'
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

  if (!formData.specialty.trim()) {
    errors.specialty = 'La especialidad es obligatoria.'
  }

  return errors
}

export function Empleados() {
  const [employees, setEmployees] = useState(() => getEmployees(initialEmployees))
  const [formData, setFormData] = useState(initialFormData)
  const [errors, setErrors] = useState({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    saveEmployees(employees)
  }, [employees])

  const activeCount = useMemo(
    () => employees.filter((emp) => emp.status === 'Activo').length,
    [employees],
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

  function handleCreateEmployee(event) {
    event.preventDefault()

    const validationErrors = validateEmployee(formData, employees)

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    const nextEmployee = {
      id: crypto.randomUUID(),
      document: formData.document.trim(),
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      specialty: formData.specialty.trim(),
      status: formData.status,
    }

    setEmployees((current) => [nextEmployee, ...current])
    closeModal()
  }

  function handleDeleteEmployee(employeeId, label) {
    setDeleteTarget({ id: employeeId, label })
  }

  function handleConfirmDelete() {
    setEmployees((current) => current.filter((emp) => emp.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Modulo administrativo</p>
          <h1>Empleados</h1>
          <p>Registro local de empleados preparado para conectarse con una API REST.</p>
        </div>

        <button className={styles.primaryButton} type="button" onClick={openModal}>
          Nuevo empleado
        </button>
      </div>

      <div className={styles.summaryBar}>
        <span>{employees.length} empleados registrados</span>
        <span>{activeCount} activos</span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Documento</th>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th>Especialidad</th>
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
                <td data-label="Teléfono">{emp.phone}</td>
                <td data-label="Correo">{emp.email}</td>
                <td data-label="Especialidad">{emp.specialty}</td>
                <td data-label="Estado">
                  <span className={styles.statusBadge} data-status={emp.status}>
                    {emp.status}
                  </span>
                </td>
                <td data-label="Acciones">
                  <button
                    className={styles.deleteButton}
                    type="button"
                    onClick={() => handleDeleteEmployee(emp.id, emp.name)}
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
              <button className={styles.iconButton} type="button" onClick={closeModal}>
                X
              </button>
            </div>

            <form className={styles.form} onSubmit={handleCreateEmployee}>
              <label className={styles.formField}>
                Documento
                <input
                  inputMode="numeric"
                  name="document"
                  value={formData.document}
                  onChange={handleInputChange}
                  placeholder="80123456"
                />
                {errors.document ? <span>{errors.document}</span> : null}
              </label>

              <label className={styles.formField}>
                Nombre completo
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Jorge Perez"
                />
                {errors.name ? <span>{errors.name}</span> : null}
              </label>

              <label className={styles.formField}>
                Teléfono
                <input
                  inputMode="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="3001112233"
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
                  placeholder="empleado@enginesjds.com"
                />
                {errors.email ? <span>{errors.email}</span> : null}
              </label>

              <label className={styles.formField}>
                Especialidad
                <input
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleInputChange}
                  placeholder="Mecánica general"
                />
                {errors.specialty ? <span>{errors.specialty}</span> : null}
              </label>

              <label className={styles.formField}>
                Estado
                <select name="status" value={formData.status} onChange={handleInputChange}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.formActions}>
                <button className={styles.secondaryButton} type="button" onClick={closeModal}>
                  Cancelar
                </button>
                <button className={styles.primaryButton} type="submit">
                  Guardar empleado
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

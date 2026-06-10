import { useEffect, useMemo, useState } from 'react'
import { getUsers, saveUsers } from '../../../services/usersService'
import { ConfirmModal } from '../../../components/ConfirmModal/ConfirmModal'
import styles from './Usuarios.module.css'

const ROLES = ['Administrador', 'Recepcionista', 'Mecánico', 'Supervisor']
const STATUSES = ['Activo', 'Inactivo', 'Bloqueado']

const initialUsers = [
  {
    id: 'usr-001',
    username: 'admin',
    email: 'admin@enginesjds.com',
    role: 'Administrador',
    status: 'Activo',
  },
  {
    id: 'usr-002',
    username: 'recepcion',
    email: 'recepcion@enginesjds.com',
    role: 'Recepcionista',
    status: 'Activo',
  },
  {
    id: 'usr-003',
    username: 'mecanico1',
    email: 'mecanico1@enginesjds.com',
    role: 'Mecánico',
    status: 'Inactivo',
  },
]

const initialFormData = {
  username: '',
  email: '',
  role: 'Administrador',
  status: 'Activo',
}

function validateUser(formData, users) {
  const errors = {}
  const username = formData.username.trim().toLowerCase()

  if (!username) {
    errors.username = 'El usuario es obligatorio.'
  } else if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    errors.username = 'Usa entre 3 y 20 caracteres: letras, numeros o guion bajo.'
  } else if (users.some((u) => u.username.toLowerCase() === username)) {
    errors.username = 'Ya existe un usuario con ese nombre.'
  }

  if (!formData.email.trim()) {
    errors.email = 'El correo es obligatorio.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
    errors.email = 'Ingresa un correo valido.'
  }

  if (!formData.role) {
    errors.role = 'El rol es obligatorio.'
  }

  return errors
}

export function Usuarios() {
  const [users, setUsers] = useState(() => getUsers(initialUsers))
  const [formData, setFormData] = useState(initialFormData)
  const [errors, setErrors] = useState({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    saveUsers(users)
  }, [users])

  const activeCount = useMemo(
    () => users.filter((u) => u.status === 'Activo').length,
    [users],
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

  function handleCreateUser(event) {
    event.preventDefault()

    const validationErrors = validateUser(formData, users)

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    const nextUser = {
      id: crypto.randomUUID(),
      username: formData.username.trim().toLowerCase(),
      email: formData.email.trim(),
      role: formData.role,
      status: formData.status,
    }

    setUsers((current) => [nextUser, ...current])
    closeModal()
  }

  function handleDeleteUser(userId, label) {
    setDeleteTarget({ id: userId, label })
  }

  function handleConfirmDelete() {
    setUsers((current) => current.filter((u) => u.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Modulo administrativo</p>
          <h1>Usuarios</h1>
          <p>Registro local de usuarios preparado para conectarse con una API REST.</p>
        </div>

        <button className={styles.primaryButton} type="button" onClick={openModal}>
          Nuevo usuario
        </button>
      </div>

      <div className={styles.summaryBar}>
        <span>{users.length} usuarios registrados</span>
        <span>{activeCount} activos</span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
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
                  <span className={styles.roleBadge} data-role={u.role}>
                    {u.role}
                  </span>
                </td>
                <td data-label="Estado">
                  <span className={styles.statusBadge} data-status={u.status}>
                    {u.status}
                  </span>
                </td>
                <td data-label="Acciones">
                  <button
                    className={styles.deleteButton}
                    type="button"
                    onClick={() => handleDeleteUser(u.id, u.username)}
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
              <button className={styles.iconButton} type="button" onClick={closeModal}>
                X
              </button>
            </div>

            <form className={styles.form} onSubmit={handleCreateUser}>
              <label className={styles.formField}>
                Usuario
                <input
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="nombre_usuario"
                />
                {errors.username ? <span>{errors.username}</span> : null}
              </label>

              <label className={styles.formField}>
                Correo electronico
                <input
                  inputMode="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="usuario@enginesjds.com"
                />
                {errors.email ? <span>{errors.email}</span> : null}
              </label>

              <label className={styles.formField}>
                Rol
                <select name="role" value={formData.role} onChange={handleInputChange}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {errors.role ? <span>{errors.role}</span> : null}
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
                  Guardar usuario
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

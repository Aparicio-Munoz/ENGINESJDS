import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import styles from '../Page.module.css'

export function Login() {
  const { isAuthenticated, login, logout, user } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError('')

    try {
      login(formData)
      setFormData((currentFormData) => ({
        ...currentFormData,
        password: '',
      }))
    } catch (loginError) {
      setError(loginError.message)
    }
  }

  return (
    <section className={styles.page}>
      <p className={styles.eyebrow}>Acceso</p>
      <h1>Login</h1>
      {isAuthenticated ? (
        <div className={styles.authPanel}>
          <p className={styles.successMessage}>
            Bienvenido, {user?.name}. Tu sesion local esta activa.
          </p>
          <button className={styles.secondaryButton} type="button" onClick={logout}>
            Cerrar sesion
          </button>
        </div>
      ) : (
        <>
          <p>Ingresa con credenciales locales para preparar el flujo futuro con JWT.</p>
          <form className={styles.authForm} onSubmit={handleSubmit}>
            <label className={styles.formField}>
              Email
              <input
                autoComplete="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="usuario@enginesjds.com"
              />
            </label>

            <label className={styles.formField}>
              Contrasena
              <input
                autoComplete="current-password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Ingresa tu contrasena"
              />
            </label>

            {error ? <p className={styles.errorMessage}>{error}</p> : null}

            <button className={styles.primaryButton} type="submit">
              Iniciar sesion
            </button>
          </form>
        </>
      )}
    </section>
  )
}

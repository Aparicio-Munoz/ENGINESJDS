import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../utils/routes'
import styles from '../Page.module.css'

export function Login() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
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
      navigate(ROUTES.admin, { replace: true })
    } catch (loginError) {
      setError(loginError.message)
    }
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.admin} replace />
  }

  return (
    <section className={styles.page}>
      <p className={styles.eyebrow}>Acceso</p>
      <h1>Login</h1>
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
    </section>
  )
}

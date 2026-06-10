import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../utils/routes'
import styles from './Login.module.css'

export function Login() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      login(formData)
      navigate(ROUTES.admin, { replace: true })
    } catch (loginError) {
      setError(loginError.message)
      setLoading(false)
    }
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.admin} replace />
  }

  return (
    <div className={styles.page}>
      {/* Left panel */}
      <div className={styles.panel} aria-hidden="true">
        <div className={styles.panelGlow} />
        <div className={styles.panelContent}>
          <div className={styles.panelBrand}>
            <span className={styles.panelMark}>◈</span>
            ENGINES JDS
          </div>
          <blockquote className={styles.panelQuote}>
            "Tu motocicleta en las mejores manos."
          </blockquote>
          <ul className={styles.panelFeatures}>
            <li>
              <span className={styles.featureCheck} aria-hidden="true">✓</span>
              Gestión de clientes y motocicletas
            </li>
            <li>
              <span className={styles.featureCheck} aria-hidden="true">✓</span>
              Control de órdenes de trabajo
            </li>
            <li>
              <span className={styles.featureCheck} aria-hidden="true">✓</span>
              Inventario y repuestos en tiempo real
            </li>
          </ul>
        </div>
        <div className={styles.panelOrb} />
      </div>

      {/* Right form */}
      <div className={styles.formSide}>
        <div className={styles.formWrapper}>
          <Link to={ROUTES.home} className={styles.backLink}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            Volver al inicio
          </Link>

          <div className={styles.formHeader}>
            <h1 className={styles.formTitle}>Bienvenido de vuelta</h1>
            <p className={styles.formSubtitle}>Ingresa tus credenciales para acceder al panel.</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                className={`${styles.input} ${error ? styles.inputError : ''}`}
                autoComplete="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="usuario@enginesjds.com"
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">Contraseña</label>
              <input
                id="password"
                className={`${styles.input} ${error ? styles.inputError : ''}`}
                autoComplete="current-password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>

            {error ? (
              <div className={styles.errorBox} role="alert">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            ) : null}

            <button className={styles.submitButton} type="submit" disabled={loading}>
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

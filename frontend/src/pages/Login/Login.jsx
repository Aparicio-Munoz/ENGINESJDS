import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../utils/routes'
import styles from './Login.module.css'

function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
      <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" />
      <path d="M10.748 13.93l2.523 2.523a10.065 10.065 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" />
    </svg>
  )
}

export function Login() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  function roleDestination(role) {
    if (role === 'Técnico')       return '/admin/motocicletas'
    if (role === 'Recepcionista') return '/admin/clientes'
    return ROUTES.admin
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const session = await login(formData)
      navigate(roleDestination(session?.user?.role), { replace: true })
    } catch (loginError) {
      setError(loginError.message || 'Credenciales incorrectas. Verifica tu correo y contraseña.')
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
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="password">Contraseña</label>
                <Link to={ROUTES.forgotPassword} className={styles.forgotLink}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className={styles.pwdWrapper}>
                <input
                  id="password"
                  className={`${styles.input} ${error ? styles.inputError : ''}`}
                  autoComplete="current-password"
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <EyeIcon open={showPwd} />
                </button>
              </div>
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
              {loading ? 'Verificando...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

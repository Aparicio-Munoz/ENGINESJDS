import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { authApi } from '../../api/authApi'
import { ROUTES } from '../../utils/routes'
import styles from './Register.module.css'

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

export function Register() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [allowed, setAllowed] = useState(null)
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    authApi.registrationStatus()
      .then((data) => setAllowed(data.allowed))
      .catch(() => setAllowed(false))
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  function validate() {
    if (!form.username.trim()) return 'El nombre es requerido'
    if (!form.email.trim()) return 'El correo es requerido'
    if (form.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
    if (!/[A-Z]/.test(form.password)) return 'La contraseña debe contener al menos una mayúscula'
    if (!/[0-9]/.test(form.password)) return 'La contraseña debe contener al menos un número'
    if (form.password !== form.confirmPassword) return 'Las contraseñas no coinciden'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setError('')
    setLoading(true)
    try {
      await authApi.publicRegister(form)
      setSuccess('Cuenta creada exitosamente. Redirigiendo al login...')
      setTimeout(() => navigate(ROUTES.login), 2000)
    } catch (err) {
      setError(err.message || 'Error al crear la cuenta')
      setLoading(false)
    }
  }

  if (isAuthenticated) return <Navigate to={ROUTES.admin} replace />
  if (allowed === null) return null

  return (
    <div className={styles.page}>
      <div className={styles.panel} aria-hidden="true">
        <div className={styles.panelGlow} />
        <div className={styles.panelContent}>
          <div className={styles.panelBrand}>
            <span className={styles.panelMark}>◈</span>
            ENGINES JDS
          </div>
          <blockquote className={styles.panelQuote}>
            Crea tu cuenta y accede al sistema.
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

      <div className={styles.formSide}>
        <div className={styles.formWrapper}>
          <Link to={ROUTES.login} className={styles.backLink}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            Volver al login
          </Link>

          <div className={styles.formHeader}>
            <h1 className={styles.formTitle}>Crear cuenta</h1>
            <p className={styles.formSubtitle}>Completa los datos para registrarte en el sistema.</p>
          </div>

          {!allowed ? (
            <div className={styles.disabledNotice}>
              <p>El registro público no está habilitado. Contacta al administrador para obtener acceso.</p>
              <Link to={ROUTES.login} className={styles.loginLink}>Volver al login</Link>
            </div>
          ) : (
            <>
              <form className={styles.form} onSubmit={handleSubmit} noValidate>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="reg-username">Nombre completo</label>
                  <input
                    id="reg-username"
                    className={`${styles.input} ${error ? styles.inputError : ''}`}
                    name="username"
                    type="text"
                    autoComplete="name"
                    value={form.username}
                    onChange={handleChange}
                    placeholder="Ej: Juan Pérez"
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="reg-email">Correo electrónico</label>
                  <input
                    id="reg-email"
                    className={`${styles.input} ${error ? styles.inputError : ''}`}
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="usuario@ejemplo.com"
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="reg-password">Contraseña</label>
                  <div className={styles.pwdWrapper}>
                    <input
                      id="reg-password"
                      className={`${styles.input} ${error ? styles.inputError : ''}`}
                      name="password"
                      type={showPwd ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                    />
                    <button type="button" className={styles.eyeBtn} onClick={() => setShowPwd((v) => !v)} aria-label={showPwd ? 'Ocultar' : 'Mostrar'}>
                      <EyeIcon open={showPwd} />
                    </button>
                  </div>
                  <p className={styles.fieldHint}>Mínimo 8 caracteres, una mayúscula y un número.</p>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="reg-confirm">Confirmar contraseña</label>
                  <div className={styles.pwdWrapper}>
                    <input
                      id="reg-confirm"
                      className={`${styles.input} ${error ? styles.inputError : ''}`}
                      name="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                    />
                    <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm((v) => !v)} aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}>
                      <EyeIcon open={showConfirm} />
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

                {success ? (
                  <div className={styles.successBox} role="status">
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                    </svg>
                    {success}
                  </div>
                ) : null}

                <button className={styles.submitButton} type="submit" disabled={loading || Boolean(success)}>
                  {loading ? 'Creando cuenta...' : 'Registrarse'}
                </button>
              </form>

              <p className={styles.loginPrompt}>
                ¿Ya tienes una cuenta?{' '}
                <Link to={ROUTES.login} className={styles.loginLink}>Iniciar sesión</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

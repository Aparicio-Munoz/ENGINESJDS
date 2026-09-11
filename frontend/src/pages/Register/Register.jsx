import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/authApi'
import { ROUTES } from '../../utils/routes'
import styles from '../Login/Login.module.css'

const initialForm = {
  businessName: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
}

function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
      <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 1 1.06 0l12.38 12.38a.75.75 0 1 1-1.06 1.06l-1.76-1.76A9.99 9.99 0 0 1 10 17a10 10 0 0 1-9.34-6.41 1.65 1.65 0 0 1 0-1.18A10 10 0 0 1 5.26 4.8L3.28 2.82a.75.75 0 0 1 0-1.06ZM7.75 6.69l1.09 1.09a2.5 2.5 0 0 1 3.37 3.37l1.1 1.1a4 4 0 0 0-5.56-5.56ZM10 3c4.26 0 7.89 2.66 9.34 6.41.15.38.15.8 0 1.18a10 10 0 0 1-3.05 4.06L5.26 4.8A9.96 9.96 0 0 1 10 3Z" clipRule="evenodd" />
    </svg>
  )
}

export function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState(initialForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, [name]: value }))
    if (error) setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      await authApi.registerWorkshop(formData)
      navigate(ROUTES.login, {
        replace: true,
        state: { registered: true },
      })
    } catch (registrationError) {
      setError(registrationError.message || 'No fue posible crear el taller. Intenta nuevamente.')
      setLoading(false)
    }
  }

  const saasEnabled = import.meta.env.VITE_SAAS_ENABLED === 'true'

  return (
    <div className={styles.page}>
      <div className={styles.panel} aria-hidden="true">
        <div className={styles.panelGlow} />
        <div className={styles.panelContent}>
          <div className={styles.panelBrand}>
            <span className={styles.panelMark}>S</span>
            <span>SGTM <small>Sistema de Gestión para Talleres</small></span>
          </div>
          <span className={styles.panelKicker}>NUEVO ESPACIO</span>
          <blockquote className={styles.panelQuote}>
            "Tu taller, organizado en un solo lugar."
          </blockquote>
          <ul className={styles.panelFeatures}>
            <li><span className={styles.featureCheck}>✓</span> Espacio independiente para tu taller</li>
            <li><span className={styles.featureCheck}>✓</span> Clientes, motos y órdenes organizados</li>
            <li><span className={styles.featureCheck}>✓</span> Prueba inicial sin datos de demostración</li>
          </ul>
        </div>
        <div className={styles.panelOrb} />
      </div>

      <div className={styles.formSide}>
        <div className={styles.formWrapper}>
          <Link to={ROUTES.login} className={styles.backLink}>← Volver al inicio de sesión</Link>

          <div className={styles.formHeader}>
            <div className={styles.mobileBrand}><span>SGTM</span> Gestión inteligente para talleres</div>
            <p className={styles.formKicker}>REGISTRO SEGURO</p>
            <h1 className={styles.formTitle}>Crea tu espacio</h1>
            <p className={styles.formSubtitle}>
              Registra tu taller y comienza con una base independiente.
            </p>
          </div>

          {!saasEnabled ? (
            <div className={styles.errorBox} role="alert">
              El registro de talleres todavía no está habilitado.
            </div>
          ) : (
            <form className={`${styles.form} ${styles.formSurface}`} onSubmit={handleSubmit} noValidate>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="businessName">Nombre del taller</label>
                <input id="businessName" className={`${styles.input} ${error ? styles.inputError : ''}`} name="businessName" value={formData.businessName} onChange={handleChange} placeholder="Taller Moto Center" required />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="username">Usuario administrador</label>
                <input id="username" className={`${styles.input} ${error ? styles.inputError : ''}`} autoComplete="username" name="username" value={formData.username} onChange={handleChange} placeholder="admin.taller" required />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">Correo electrónico</label>
                <input id="email" className={`${styles.input} ${error ? styles.inputError : ''}`} autoComplete="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="tu@taller.com" required />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="password">Contraseña</label>
                <div className={styles.pwdWrapper}>
                  <input id="password" className={`${styles.input} ${error ? styles.inputError : ''}`} autoComplete="new-password" name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange} placeholder="Mínimo 8 caracteres" required />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}><EyeIcon open={showPassword} /></button>
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="confirmPassword">Confirmar contraseña</label>
                <div className={styles.pwdWrapper}>
                  <input id="confirmPassword" className={`${styles.input} ${error ? styles.inputError : ''}`} autoComplete="new-password" name="confirmPassword" type={showConfirm ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleChange} placeholder="Repite tu contraseña" required />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm((value) => !value)} aria-label={showConfirm ? 'Ocultar confirmación' : 'Mostrar confirmación'}><EyeIcon open={showConfirm} /></button>
                </div>
              </div>

              {error ? <div className={styles.errorBox} role="alert">{error}</div> : null}

              <button className={styles.submitButton} type="submit" disabled={loading}>
                {loading ? 'Preparando tu espacio...' : 'Crear cuenta del taller'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

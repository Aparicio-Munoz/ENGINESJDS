import { Link } from 'react-router-dom'
import { ROUTES } from '../../utils/routes'
import styles from './ResetPassword.module.css'

export function ResetPassword() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.infoState}>
          <div className={styles.infoIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className={styles.title}>Enlace no válido</h1>
          <p className={styles.subtitle}>
            El sistema de recuperación por enlace fue actualizado. Ahora utiliza un código de
            6 dígitos enviado a tu correo.
          </p>
          <Link to={ROUTES.forgotPassword} className={styles.actionLink}>
            Recuperar contraseña con código
          </Link>
          <Link to={ROUTES.login} className={styles.backLink}>
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  )
}

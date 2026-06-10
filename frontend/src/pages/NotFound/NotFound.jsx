import { Link } from 'react-router-dom'
import { ROUTES } from '../../utils/routes'
import styles from './NotFound.module.css'

export function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.content}>
        <div className={styles.codeWrapper} aria-hidden="true">
          <span className={styles.code}>404</span>
          <div className={styles.codeGlow} />
        </div>

        <div className={styles.iconWrapper} aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none" width="56" height="56">
            <circle cx="32" cy="32" r="30" stroke="rgba(249,115,22,0.3)" strokeWidth="2" />
            <path d="M32 20v16" stroke="#F97316" strokeWidth="3" strokeLinecap="round" />
            <circle cx="32" cy="42" r="2.5" fill="#F97316" />
          </svg>
        </div>

        <h1 className={styles.title}>Página no encontrada</h1>
        <p className={styles.subtitle}>
          La ruta que buscas no existe o fue movida.
          <br />
          Verifica la URL o regresa al inicio.
        </p>

        <div className={styles.actions}>
          <Link to={ROUTES.home} className={styles.btnPrimary}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
            </svg>
            Volver al inicio
          </Link>
          <Link to={ROUTES.admin} className={styles.btnSecondary}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75H10a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
            </svg>
            Ir al panel
          </Link>
        </div>
      </div>
    </div>
  )
}

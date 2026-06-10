import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ROUTES } from '../../utils/routes'
import styles from './Navbar.module.css'

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Navegación principal">
        <Link to={ROUTES.home} className={styles.brand} onClick={closeMenu}>
          <span className={styles.brandMark} aria-hidden="true">◈</span>
          ENGINES JDS
        </Link>

        <div className={styles.desktopLinks}>
          <a href="/#servicios" className={styles.link}>Servicios</a>
          <NavLink
            to={ROUTES.repuestos}
            className={({ isActive }) => isActive ? `${styles.link} ${styles.activeLink}` : styles.link}
          >
            Repuestos
          </NavLink>
          <NavLink
            to={ROUTES.agendarCita}
            className={({ isActive }) => isActive ? `${styles.link} ${styles.activeLink}` : styles.link}
          >
            Agendar cita
          </NavLink>
        </div>

        <div className={styles.desktopActions}>
          <Link to={ROUTES.login} className={styles.ctaButton}>
            Acceder
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>

        <button
          className={styles.menuToggle}
          type="button"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span className={`${styles.bar} ${menuOpen ? styles.barOpen1 : ''}`} />
          <span className={`${styles.bar} ${menuOpen ? styles.barOpen2 : ''}`} />
          <span className={`${styles.bar} ${menuOpen ? styles.barOpen3 : ''}`} />
        </button>
      </nav>

      {menuOpen ? (
        <div className={styles.mobileMenu}>
          <a href="/#servicios" className={styles.mobileLink} onClick={closeMenu}>Servicios</a>
          <NavLink to={ROUTES.repuestos} className={styles.mobileLink} onClick={closeMenu}>
            Repuestos
          </NavLink>
          <NavLink to={ROUTES.agendarCita} className={styles.mobileLink} onClick={closeMenu}>
            Agendar cita
          </NavLink>
          <Link to={ROUTES.login} className={styles.mobileCta} onClick={closeMenu}>
            Acceder al panel
          </Link>
        </div>
      ) : null}
    </header>
  )
}

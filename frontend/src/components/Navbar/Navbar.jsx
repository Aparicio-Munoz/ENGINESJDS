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
        </div>
      ) : null}
    </header>
  )
}

import { NavLink } from 'react-router-dom'
import { ROUTES } from '../../utils/routes'
import styles from './Navbar.module.css'

const navItems = [
  { to: ROUTES.home, label: 'Inicio', end: true },
  { to: ROUTES.login, label: 'Login' },
  { to: ROUTES.register, label: 'Registro' },
]

export function Navbar() {
  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Navegacion principal">
        <NavLink to={ROUTES.home} className={styles.brand}>
          ENGINES JDS
        </NavLink>

        <div className={styles.links}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.activeLink}` : styles.link
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  )
}

import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../utils/routes'
import styles from './DashboardLayout.module.css'

const sidebarItems = [
  { label: 'Dashboard', to: ROUTES.admin, end: true },
  { label: 'Usuarios', to: `${ROUTES.admin}/usuarios` },
  { label: 'Empleados', to: `${ROUTES.admin}/empleados` },
  { label: 'Motocicletas', to: `${ROUTES.admin}/motocicletas` },
  { label: 'Ordenes de trabajo', to: `${ROUTES.admin}/ordenes` },
  { label: 'Inventario', to: `${ROUTES.admin}/inventario` },
  { label: 'Reportes', to: `${ROUTES.admin}/reportes` },
  { label: 'Configuracion', to: `${ROUTES.admin}/configuracion` },
]

export function DashboardLayout() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate(ROUTES.login)
  }

  return (
    <div className={styles.dashboardShell}>
      <aside className={styles.sidebar}>
        <NavLink to={ROUTES.admin} className={styles.brand}>
          ENGINES JDS
        </NavLink>

        <nav className={styles.sidebarNav} aria-label="Navegacion administrativa">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? `${styles.navItem} ${styles.activeNavItem}` : styles.navItem
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className={styles.contentShell}>
        <header className={styles.topHeader}>
          <div>
            <p className={styles.headerLabel}>Administrador</p>
            <p className={styles.userName}>{user?.name || 'Usuario invitado'}</p>
          </div>

          <button className={styles.logoutButton} type="button" onClick={handleLogout}>
            Cerrar sesion
          </button>
        </header>

        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

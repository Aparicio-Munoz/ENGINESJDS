import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { GlobalSearch } from '../../components/GlobalSearch/GlobalSearch'
import { NotificationCenter } from '../../components/NotificationCenter/NotificationCenter'
import { ROUTES } from '../../utils/routes'
import styles from './DashboardLayout.module.css'

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    to: ROUTES.admin,
    end: true,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Clientes',
    to: ROUTES.adminClientes,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 17a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
      </svg>
    ),
  },
  {
    label: 'Motocicletas',
    to: `${ROUTES.admin}/motocicletas`,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 0 1-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 0 1 .947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 0 1 2.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 0 1 2.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 0 1 .947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 0 1-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 0 1-2.287-.947ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Citas',
    to: ROUTES.adminCitas,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Órdenes de trabajo',
    to: ROUTES.adminOrdenes,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path fillRule="evenodd" d="M4 4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-5L9 4H4Zm7 5a1 1 0 1 0-2 0v1H8a1 1 0 1 0 0 2h1v1a1 1 0 1 0 2 0v-1h1a1 1 0 1 0 0-2h-1V9Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Inventario',
    to: ROUTES.adminInventario,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path d="M2 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2ZM2 7.5h16l-.811 7.71a2 2 0 0 1-1.99 1.79H4.802a2 2 0 0 1-1.99-1.79L2 7.5Z" />
      </svg>
    ),
  },
  {
    label: 'Empleados',
    to: ROUTES.adminEmpleados,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
      </svg>
    ),
  },
  {
    label: 'Usuarios',
    to: `${ROUTES.admin}/usuarios`,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-5.5-2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM10 12a5.99 5.99 0 0 0-4.793 2.39A6.483 6.483 0 0 0 10 16.5a6.483 6.483 0 0 0 4.793-2.11A5.99 5.99 0 0 0 10 12Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Reportes',
    to: ROUTES.adminReportes,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path d="M15.5 2A1.5 1.5 0 0 0 14 3.5v13a1.5 1.5 0 0 0 3 0v-13A1.5 1.5 0 0 0 15.5 2ZM10.5 6A1.5 1.5 0 0 0 9 7.5v9a1.5 1.5 0 0 0 3 0v-9A1.5 1.5 0 0 0 10.5 6ZM5.5 10A1.5 1.5 0 0 0 4 11.5v5a1.5 1.5 0 0 0 3 0v-5A1.5 1.5 0 0 0 5.5 10Z" />
      </svg>
    ),
  },
]

export function DashboardLayout() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate(ROUTES.login)
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <NavLink to={ROUTES.admin} className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">◈</span>
          ENGINES JDS
        </NavLink>

        <nav className={styles.nav} aria-label="Navegación administrativa">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userChip}>
            <div className={styles.userAvatar} aria-hidden="true">
              {(user?.name || 'U')[0].toUpperCase()}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name || 'Usuario'}</span>
              <span className={styles.userRole}>Administrador</span>
            </div>
          </div>
          <button
            className={styles.logoutButton}
            type="button"
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
              <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-.943a.75.75 0 1 0-1.004-1.114l-2.5 2.25a.75.75 0 0 0 0 1.114l2.5 2.25a.75.75 0 1 0 1.004-1.114l-1.048-.943h9.546A.75.75 0 0 0 19 10Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </aside>

      <div className={styles.contentShell}>
        <div className={styles.topBar}>
          <GlobalSearch />
          <NotificationCenter />
        </div>
        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

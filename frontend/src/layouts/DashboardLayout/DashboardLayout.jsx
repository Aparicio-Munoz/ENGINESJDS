import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { GlobalSearch } from '../../components/GlobalSearch/GlobalSearch'
import { NotificationCenter } from '../../components/NotificationCenter/NotificationCenter'
import { ROUTES } from '../../utils/routes'
import styles from './DashboardLayout.module.css'

// ── Definición completa de ítems de navegación ──────────────────────────────
// `roles` define qué roles pueden ver cada ítem.
const NAV_ITEMS = [
  // ── Admin / Recepcionista ─────────────────────────────
  {
    label: 'Dashboard',
    to: ROUTES.admin,
    end: true,
    roles: ['Administrador'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Clientes',
    to: ROUTES.adminClientes,
    roles: ['Administrador', 'Recepcionista'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 17a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
      </svg>
    ),
  },
  {
    label: 'Motocicletas',
    to: `${ROUTES.admin}/motocicletas`,
    roles: ['Administrador', 'Recepcionista'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 0 1-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 0 1 .947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 0 1 2.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 0 1 2.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 0 1 .947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 0 1-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 0 1-2.287-.947ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Citas',
    to: ROUTES.adminCitas,
    roles: ['Administrador', 'Recepcionista'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Órdenes de trabajo',
    to: ROUTES.adminOrdenes,
    roles: ['Administrador', 'Recepcionista'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path fillRule="evenodd" d="M4 4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-5L9 4H4Zm7 5a1 1 0 1 0-2 0v1H8a1 1 0 1 0 0 2h1v1a1 1 0 1 0 2 0v-1h1a1 1 0 1 0 0-2h-1V9Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Inventario',
    to: ROUTES.adminInventario,
    roles: ['Administrador'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path d="M2 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2ZM2 7.5h16l-.811 7.71a2 2 0 0 1-1.99 1.79H4.802a2 2 0 0 1-1.99-1.79L2 7.5Z" />
      </svg>
    ),
  },
  {
    label: 'Marcas',
    to: ROUTES.adminMarcas,
    roles: ['Administrador'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path fillRule="evenodd" d="M5.5 3A2.5 2.5 0 0 0 3 5.5v2.879a2.5 2.5 0 0 0 .732 1.767l6.5 6.5a2.5 2.5 0 0 0 3.536 0l2.878-2.878a2.5 2.5 0 0 0 0-3.536l-6.5-6.5A2.5 2.5 0 0 0 8.38 3H5.5ZM6 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Empleados',
    to: ROUTES.adminEmpleados,
    roles: ['Administrador'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
      </svg>
    ),
  },
  {
    label: 'Usuarios',
    to: `${ROUTES.admin}/usuarios`,
    roles: ['Administrador'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-5.5-2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM10 12a5.99 5.99 0 0 0-4.793 2.39A6.483 6.483 0 0 0 10 16.5a6.483 6.483 0 0 0 4.793-2.11A5.99 5.99 0 0 0 10 12Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Reportes',
    to: ROUTES.adminReportes,
    roles: ['Administrador'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path d="M15.5 2A1.5 1.5 0 0 0 14 3.5v13a1.5 1.5 0 0 0 3 0v-13A1.5 1.5 0 0 0 15.5 2ZM10.5 6A1.5 1.5 0 0 0 9 7.5v9a1.5 1.5 0 0 0 3 0v-9A1.5 1.5 0 0 0 10.5 6ZM5.5 10A1.5 1.5 0 0 0 4 11.5v5a1.5 1.5 0 0 0 3 0v-5A1.5 1.5 0 0 0 5.5 10Z" />
      </svg>
    ),
  },
  {
    label: 'Facturación',
    to: ROUTES.adminFacturas,
    roles: ['Administrador'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path fillRule="evenodd" d="M1 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4Zm12 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM4 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm13-1a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM1.75 14.5a.75.75 0 0 0 0 1.5c4.417 0 8.693.603 12.749 1.73 1.111.309 2.251-.512 2.251-1.696v-.784a.75.75 0 0 0-1.5 0v.784a.272.272 0 0 1-.35.25A49.043 49.043 0 0 0 1.75 14.5Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'CRM',
    to: ROUTES.adminCRM,
    roles: ['Administrador'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path d="M3.505 2.365A41.369 41.369 0 0 1 9 2c1.863 0 3.697.124 5.495.365 1.247.167 2.18 1.108 2.435 2.268a4.45 4.45 0 0 0-.577-.069 43.141 43.141 0 0 0-4.706 0C9.229 4.696 7.5 6.727 7.5 8.998v2.24c0 1.413.67 2.735 1.76 3.562l-2.98 2.98A.75.75 0 0 1 5 17.25v-3.443c-.501-.048-1-.106-1.495-.172C2.033 13.438 1 12.162 1 10.72V5.28c0-1.441 1.033-2.717 2.505-2.914Z" />
        <path d="M14 6c.762 0 1.52.02 2.272.06C17.802 6.153 19 7.564 19 9.198v3.88c0 1.635-1.199 3.046-2.728 3.138-.507.03-1.017.052-1.528.065v2.969a.75.75 0 0 1-1.28.53l-3.245-3.245a42.51 42.51 0 0 1-2.17-.122C6.826 16.323 5.5 14.865 5.5 13.078V9.198c0-1.634 1.199-3.045 2.728-3.138A42.209 42.209 0 0 1 14 6Z" />
      </svg>
    ),
  },
  {
    label: 'Auditoría',
    to: ROUTES.adminAuditoria,
    roles: ['Administrador'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path fillRule="evenodd" d="M10 1c-1.716 0-3.408.106-5.07.31C3.806 1.45 3 2.414 3 3.517V16.75A2.25 2.25 0 0 0 5.25 19h9.5A2.25 2.25 0 0 0 17 16.75V3.517c0-1.103-.806-2.068-1.93-2.207A41.403 41.403 0 0 0 10 1ZM7.25 6a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5h-5.5Zm0 3.5a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5h-5.5Zm0 3.5a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Respaldos',
    to: ROUTES.adminBackups,
    roles: ['Administrador'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
        <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
      </svg>
    ),
  },
  // ── Panel Técnico ─────────────────────────────────────
  {
    label: 'Dashboard Técnico',
    to: ROUTES.tecnicoDashboard,
    roles: ['Técnico'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Motos asignadas',
    to: ROUTES.tecnicoMotos,
    roles: ['Técnico'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 0 1-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 0 1 .947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 0 1 2.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 0 1 2.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 0 1 .947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 0 1-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 0 1-2.287-.947ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Órdenes de trabajo',
    to: ROUTES.tecnicoOrdenes,
    roles: ['Técnico'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path fillRule="evenodd" d="M4 4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-5L9 4H4Zm7 5a1 1 0 1 0-2 0v1H8a1 1 0 1 0 0 2h1v1a1 1 0 1 0 2 0v-1h1a1 1 0 1 0 0-2h-1V9Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Solicitud de repuestos',
    to: ROUTES.tecnicoRepuestos,
    roles: ['Técnico'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path d="M2 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2ZM2 7.5h16l-.811 7.71a2 2 0 0 1-1.99 1.79H4.802a2 2 0 0 1-1.99-1.79L2 7.5Z" />
      </svg>
    ),
  },
  {
    label: 'Ganancias',
    to: ROUTES.tecnicoGanancias,
    roles: ['Técnico'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
        <path d="M15.5 2A1.5 1.5 0 0 0 14 3.5v13a1.5 1.5 0 0 0 3 0v-13A1.5 1.5 0 0 0 15.5 2ZM10.5 6A1.5 1.5 0 0 0 9 7.5v9a1.5 1.5 0 0 0 3 0v-9A1.5 1.5 0 0 0 10.5 6ZM5.5 10A1.5 1.5 0 0 0 4 11.5v5a1.5 1.5 0 0 0 3 0v-5A1.5 1.5 0 0 0 5.5 10Z" />
      </svg>
    ),
  },
]

// ── Íconos de rol ────────────────────────────────────────────────────────────
function RoleBadgeIcon({ role }) {
  if (role === 'Técnico') {
    return (
      <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10" aria-hidden="true">
        <path fillRule="evenodd" d="M14.69 2.21l-1.76 1.03a4.5 4.5 0 0 0-7.04 4.06L2.3 12.7a1 1 0 1 0 1.42 1.42l4.49-3.59a4.5 4.5 0 0 0 4.06-7.04l-1.03 1.76a1 1 0 1 1-1.73-1l1.03-1.76a4.5 4.5 0 0 0-1.54 8.16l.01.01-4.49 3.59A2.5 2.5 0 1 1 .77 10.7l3.44-5.59a6 6 0 0 1 9.48-3.9Z" clipRule="evenodd" />
      </svg>
    )
  }
  if (role === 'Recepcionista') {
    return (
      <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10" aria-hidden="true">
        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0Zm8.25-3.25a.75.75 0 0 0-1.5 0v3.5l-2 1.5a.75.75 0 1 0 .9 1.2l2.35-1.76a.75.75 0 0 0 .25-.57v-3.87Z" />
      </svg>
    )
  }
  return null
}

export function DashboardLayout() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 900)
  const [accessBanner, setAccessBanner] = useState('')
  const profileRef = useRef(null)
  const bannerTimerRef = useRef(null)
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 900

  // ── Close sidebar on mobile nav ────────────────────────────────────────────
  useEffect(() => {
    if (window.innerWidth <= 900) setSidebarOpen(false)
  }, [location.pathname])

  // ── Banner de acceso denegado ──────────────────────────────────────────────
  useEffect(() => {
    if (location.state?.accessDenied) {
      clearTimeout(bannerTimerRef.current)
      setAccessBanner('No tienes permisos para acceder a este módulo.')
      bannerTimerRef.current = setTimeout(() => setAccessBanner(''), 5000)
    }
    return () => clearTimeout(bannerTimerRef.current)
  }, [location.key]) // dispara por cada navegación, no sólo por cambio de state

  // ── Cerrar menú al hacer clic afuera ──────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleLogout() {
    logout()
    navigate(ROUTES.login)
  }

  // Filtrar ítems de navegación según el rol del usuario
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => item.roles.includes(user?.role)
  )

  const isAdmin = user?.role === 'Administrador'

  return (
    <div className={`${styles.shell} ${sidebarOpen ? styles.shellOpen : styles.shellClosed}`}>
      {/* Mobile overlay */}
      {sidebarOpen && isMobile ? (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      ) : null}

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
        <NavLink to={ROUTES.admin} className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">◈</span>
          ENGINES JDS
        </NavLink>

        <nav className={styles.nav} aria-label="Navegación administrativa">
          {visibleNavItems.map((item) => (
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

        <div className={styles.sidebarFooter} ref={profileRef}>
          {profileOpen ? (
            <div className={styles.profileMenu} role="menu" aria-label="Menú de usuario">
              <button
                className={styles.profileMenuItem}
                type="button"
                role="menuitem"
                onClick={() => { navigate(ROUTES.adminPerfil); setProfileOpen(false) }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-5.5-2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM10 12a5.99 5.99 0 0 0-4.793 2.39A6.483 6.483 0 0 0 10 16.5a6.483 6.483 0 0 0 4.793-2.11A5.99 5.99 0 0 0 10 12Z" clipRule="evenodd" />
                </svg>
                Mi perfil
              </button>

              {/* Configuración solo para Administrador */}
              {isAdmin && (
                <button
                  className={styles.profileMenuItem}
                  type="button"
                  role="menuitem"
                  onClick={() => { navigate(`${ROUTES.admin}/configuracion`); setProfileOpen(false) }}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.993 6.993 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                  </svg>
                  Configuración
                </button>
              )}

              <div className={styles.profileMenuDivider} />
              <button
                className={`${styles.profileMenuItem} ${styles.profileMenuItemDanger}`}
                type="button"
                role="menuitem"
                onClick={() => { handleLogout(); setProfileOpen(false) }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15" aria-hidden="true">
                  <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-.943a.75.75 0 1 0-1.004-1.114l-2.5 2.25a.75.75 0 0 0 0 1.114l2.5 2.25a.75.75 0 1 0 1.004-1.114l-1.048-.943h9.546A.75.75 0 0 0 19 10Z" clipRule="evenodd" />
                </svg>
                Cerrar sesión
              </button>
            </div>
          ) : null}

          <button
            className={styles.userChip}
            type="button"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            aria-label="Menú de usuario"
            onClick={() => setProfileOpen((v) => !v)}
          >
            <div className={styles.userAvatar} aria-hidden="true">
              {(user?.username || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.username || user?.email || 'Usuario'}</span>
              <span className={styles.userRole}>
                {user?.role && user.role !== 'Administrador' && (
                  <RoleBadgeIcon role={user.role} />
                )}
                {user?.role || 'Sin rol'}
              </span>
            </div>
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              width="14"
              height="14"
              aria-hidden="true"
              className={`${styles.chevron} ${profileOpen ? styles.chevronUp : ''}`}
            >
              <path fillRule="evenodd" d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </aside>

      <div className={styles.contentShell}>
        <div className={styles.topBar}>
          <button
            className={styles.hamburger}
            type="button"
            aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
              {sidebarOpen ? (
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              ) : (
                <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
              )}
            </svg>
          </button>
          <GlobalSearch />
          <NotificationCenter />
        </div>

        {/* Banner de acceso denegado */}
        {accessBanner && (
          <div className={styles.accessBanner} role="alert" aria-live="assertive">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            {accessBanner}
            <button
              className={styles.accessBannerClose}
              type="button"
              aria-label="Cerrar"
              onClick={() => setAccessBanner('')}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        )}

        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

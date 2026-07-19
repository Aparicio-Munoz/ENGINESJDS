import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { DashboardLayout } from '../layouts/DashboardLayout/DashboardLayout'
import { DashboardAdmin } from '../pages/DashboardAdmin/DashboardAdmin'
import { Perfil } from '../pages/admin/Perfil/Perfil'
import { Configuracion } from '../pages/admin/Configuracion/Configuracion'
import { Login } from '../pages/Login/Login'
import { ForgotPassword } from '../pages/ForgotPassword/ForgotPassword'
import { ResetPassword } from '../pages/ResetPassword/ResetPassword'
import { Clientes } from '../pages/admin/Clientes/Clientes'
import { Motocicletas } from '../pages/admin/Motocicletas/Motocicletas'
import { ProtectedRoute } from '../components/ProtectedRoute/ProtectedRoute'
import { RoleRoute } from '../components/RoleRoute/RoleRoute'
import { Empleados } from '../pages/admin/Empleados/Empleados'
import { Reportes } from '../pages/admin/Reportes/Reportes'
import { Usuarios } from '../pages/admin/Usuarios/Usuarios'
import { Inventario } from '../pages/admin/Inventario/Inventario'
import { Marcas } from '../pages/admin/Marcas/Marcas'
import { OrdenesTrabajo } from '../pages/admin/OrdenesTrabajo/OrdenesTrabajo'
import { Citas } from '../pages/admin/Citas/Citas'
import { Auditoria } from '../pages/admin/Auditoria/Auditoria'
import { Backups } from '../pages/admin/Backups/Backups'
import { Facturas } from '../pages/admin/Facturas/Facturas'
import { HistorialMoto } from '../pages/admin/HistorialMoto/HistorialMoto'
import { CRM } from '../pages/admin/CRM/CRM'
import { NotFound } from '../pages/NotFound/NotFound'
import { DashboardTecnico } from '../pages/tecnico/DashboardTecnico/DashboardTecnico'
import { OrdenesAsignadas } from '../pages/tecnico/OrdenesAsignadas/OrdenesAsignadas'
import { MotosAsignadas } from '../pages/tecnico/MotosAsignadas/MotosAsignadas'
import { SolicitudRepuestos } from '../pages/tecnico/SolicitudRepuestos/SolicitudRepuestos'
import { Ganancias } from '../pages/tecnico/Ganancias/Ganancias'
import { Tracking } from '../pages/Tracking/Tracking'
import { ROUTES } from '../utils/routes'
import { useAuth } from '../hooks/useAuth'

// ── Componente índice: redirige al home del rol ──────────────────────────────
function AdminIndex() {
  const { user } = useAuth()
  if (user?.role === 'Técnico')       return <Navigate to={ROUTES.tecnicoDashboard} replace />
  if (user?.role === 'Recepcionista') return <Navigate to={ROUTES.adminClientes} replace />
  return <DashboardAdmin />
}

// ── Matriz de acceso por ruta ────────────────────────────────────────────────
//   RoleRoute redirige al home del rol con banner de acceso denegado
//   cuando el usuario no tiene permisos.

const router = createBrowserRouter([
  // ── Raíz: siempre redirige al login (sin landing pública) ──
  { path: ROUTES.home, element: <Navigate to={ROUTES.login} replace /> },
  { path: ROUTES.login,          element: <Login /> },
  { path: ROUTES.forgotPassword, element: <ForgotPassword /> },
  { path: ROUTES.resetPassword,  element: <ResetPassword /> },
  {
    path: ROUTES.admin,
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      // ── Índice: redirige según rol (sin banner de error) ──
      { index: true, element: <AdminIndex /> },

      // ── Accesible a todos los roles autenticados ──────────
      { path: 'perfil', element: <Perfil /> },

      // ── Clientes: Admin + Recepcionista ───────────────────
      {
        path: 'clientes',
        element: (
          <RoleRoute allowedRoles={['Administrador', 'Recepcionista']}>
            <Clientes />
          </RoleRoute>
        ),
      },

      // ── Motocicletas: Admin + Recepcionista ─────────────────
      {
        path: 'motocicletas',
        element: (
          <RoleRoute allowedRoles={['Administrador', 'Recepcionista']}>
            <Motocicletas />
          </RoleRoute>
        ),
      },

      // ── Citas: Admin + Recepcionista ──────────────────────
      {
        path: 'citas',
        element: (
          <RoleRoute allowedRoles={['Administrador', 'Recepcionista']}>
            <Citas />
          </RoleRoute>
        ),
      },

      // ── Órdenes: Admin + Recepcionista ──────────────────────
      {
        path: 'ordenes',
        element: (
          <RoleRoute allowedRoles={['Administrador', 'Recepcionista']}>
            <OrdenesTrabajo />
          </RoleRoute>
        ),
      },

      // ── Inventario: solo Administrador ────────────────────
      {
        path: 'inventario',
        element: (
          <RoleRoute allowedRoles={['Administrador']}>
            <Inventario />
          </RoleRoute>
        ),
      },

      // ── Marcas: solo Administrador ────────────────────────
      {
        path: 'marcas',
        element: (
          <RoleRoute allowedRoles={['Administrador']}>
            <Marcas />
          </RoleRoute>
        ),
      },

      // ── Empleados: solo Administrador ──────────────────────
      {
        path: 'empleados',
        element: (
          <RoleRoute allowedRoles={['Administrador']}>
            <Empleados />
          </RoleRoute>
        ),
      },

      // ── Usuarios: solo Administrador ──────────────────────
      {
        path: 'usuarios',
        element: (
          <RoleRoute allowedRoles={['Administrador']}>
            <Usuarios />
          </RoleRoute>
        ),
      },

      // ── Reportes: solo Administrador ──────────────────────
      {
        path: 'reportes',
        element: (
          <RoleRoute allowedRoles={['Administrador']}>
            <Reportes />
          </RoleRoute>
        ),
      },

      // ── Configuración: solo Administrador ─────────────────
      {
        path: 'configuracion',
        element: (
          <RoleRoute allowedRoles={['Administrador']}>
            <Configuracion />
          </RoleRoute>
        ),
      },

      // ── Auditoría: solo Administrador ─────────────────────
      {
        path: 'auditoria',
        element: (
          <RoleRoute allowedRoles={['Administrador']}>
            <Auditoria />
          </RoleRoute>
        ),
      },

      // ── CRM: solo Administrador ─────────────────────────────
      {
        path: 'crm',
        element: (
          <RoleRoute allowedRoles={['Administrador']}>
            <CRM />
          </RoleRoute>
        ),
      },

      // ── Historial clínico de moto ──────────────────────────
      {
        path: 'historial-moto/:id',
        element: (
          <RoleRoute allowedRoles={['Administrador', 'Recepcionista']}>
            <HistorialMoto />
          </RoleRoute>
        ),
      },

      // ── Facturación: solo Administrador ────────────────────
      {
        path: 'facturas',
        element: (
          <RoleRoute allowedRoles={['Administrador']}>
            <Facturas />
          </RoleRoute>
        ),
      },

      // ── Respaldos: solo Administrador ─────────────────────
      {
        path: 'backups',
        element: (
          <RoleRoute allowedRoles={['Administrador']}>
            <Backups />
          </RoleRoute>
        ),
      },

      // ── Panel Técnico: solo Técnico ──────────────────────
      {
        path: 'tecnico-dashboard',
        element: (
          <RoleRoute allowedRoles={['Técnico']}>
            <DashboardTecnico />
          </RoleRoute>
        ),
      },
      {
        path: 'ordenes-tecnico',
        element: (
          <RoleRoute allowedRoles={['Técnico']}>
            <OrdenesAsignadas />
          </RoleRoute>
        ),
      },
      {
        path: 'motos-asignadas',
        element: (
          <RoleRoute allowedRoles={['Técnico']}>
            <MotosAsignadas />
          </RoleRoute>
        ),
      },
      {
        path: 'solicitud-repuestos',
        element: (
          <RoleRoute allowedRoles={['Técnico']}>
            <SolicitudRepuestos />
          </RoleRoute>
        ),
      },
      {
        path: 'ganancias',
        element: (
          <RoleRoute allowedRoles={['Técnico']}>
            <Ganancias />
          </RoleRoute>
        ),
      },
    ],
  },
  // ── Seguimiento público (sin login) ────────────────
  { path: '/tracking/:token', element: <Tracking /> },

  { path: '*', element: <NotFound /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}

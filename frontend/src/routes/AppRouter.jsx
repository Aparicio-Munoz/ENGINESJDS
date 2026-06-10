import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { DashboardLayout } from '../layouts/DashboardLayout/DashboardLayout'
import { MainLayout } from '../layouts/MainLayout'
import { AdminSectionPlaceholder } from '../pages/DashboardAdmin/AdminSectionPlaceholder'
import { DashboardAdmin } from '../pages/DashboardAdmin/DashboardAdmin'
import { Home } from '../pages/Home/Home'
import { Login } from '../pages/Login/Login'
import { AgendarCita } from '../pages/AgendarCita/AgendarCita'
import { Repuestos } from '../pages/Repuestos/Repuestos'
import { Clientes } from '../pages/admin/Clientes/Clientes'
import { Motocicletas } from '../pages/admin/Motocicletas/Motocicletas'
import { ProtectedRoute } from '../components/ProtectedRoute/ProtectedRoute'
import { Empleados } from '../pages/admin/Empleados/Empleados'
import { Reportes } from '../pages/admin/Reportes/Reportes'
import { Usuarios } from '../pages/admin/Usuarios/Usuarios'
import { Inventario } from '../pages/admin/Inventario/Inventario'
import { OrdenesTrabajo } from '../pages/admin/OrdenesTrabajo/OrdenesTrabajo'
import { Citas } from '../pages/admin/Citas/Citas'
import { Register } from '../pages/Register/Register'
import { NotFound } from '../pages/NotFound/NotFound'
import { ROUTES } from '../utils/routes'

const router = createBrowserRouter([
  {
    path: ROUTES.home,
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: ROUTES.login,
        element: <Login />,
      },
      {
        path: ROUTES.register,
        element: <Register />,
      },
      {
        path: ROUTES.agendarCita,
        element: <AgendarCita />,
      },
      {
        path: ROUTES.repuestos,
        element: <Repuestos />,
      },
    ],
  },
  {
    path: ROUTES.admin,
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardAdmin />,
      },
      {
        path: 'usuarios',
        element: <Usuarios />,
      },
      {
        path: 'empleados',
        element: <Empleados />,
      },
      {
        path: 'clientes',
        element: <Clientes />,
      },
      {
        path: 'motocicletas',
        element: <Motocicletas />,
      },
      {
        path: 'citas',
        element: <Citas />,
      },
      {
        path: 'ordenes',
        element: <OrdenesTrabajo />,
      },
      {
        path: 'inventario',
        element: <Inventario />,
      },
      {
        path: 'reportes',
        element: <Reportes />,
      },
      {
        path: 'configuracion',
        element: <AdminSectionPlaceholder title="Configuracion" />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}

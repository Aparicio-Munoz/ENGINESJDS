import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { DashboardLayout } from '../layouts/DashboardLayout/DashboardLayout'
import { MainLayout } from '../layouts/MainLayout'
import { AdminSectionPlaceholder } from '../pages/DashboardAdmin/AdminSectionPlaceholder'
import { DashboardAdmin } from '../pages/DashboardAdmin/DashboardAdmin'
import { Home } from '../pages/Home/Home'
import { Login } from '../pages/Login/Login'
import { Clientes } from '../pages/admin/Clientes/Clientes'
import { Motocicletas } from '../pages/admin/Motocicletas/Motocicletas'
import { OrdenesTrabajo } from '../pages/admin/OrdenesTrabajo/OrdenesTrabajo'
import { Register } from '../pages/Register/Register'
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
    ],
  },
  {
    path: ROUTES.admin,
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <DashboardAdmin />,
      },
      {
        path: 'usuarios',
        element: <AdminSectionPlaceholder title="Usuarios" />,
      },
      {
        path: 'empleados',
        element: <AdminSectionPlaceholder title="Empleados" />,
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
        path: 'ordenes',
        element: <OrdenesTrabajo />,
      },
      {
        path: 'inventario',
        element: <AdminSectionPlaceholder title="Inventario" />,
      },
      {
        path: 'reportes',
        element: <AdminSectionPlaceholder title="Reportes" />,
      },
      {
        path: 'configuracion',
        element: <AdminSectionPlaceholder title="Configuracion" />,
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}

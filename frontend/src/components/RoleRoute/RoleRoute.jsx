import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

/**
 * Retorna la ruta de inicio según el rol del usuario.
 * Se usa como destino de redirección cuando el acceso es denegado.
 */
export function getDefaultRoute(role) {
  if (role === 'Técnico')       return '/admin/tecnico-dashboard'
  if (role === 'Recepcionista') return '/admin/clientes'
  return '/admin'
}

/**
 * Protege una ruta por rol.
 * Si el usuario no tiene el rol requerido, redirige a su ruta de inicio
 * con state.accessDenied = true para que DashboardLayout muestre el banner.
 */
export function RoleRoute({ allowedRoles, children }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user?.role || !allowedRoles.includes(user.role)) {
    const redirectTo = getDefaultRoute(user?.role)
    return (
      <Navigate
        to={redirectTo}
        state={{ accessDenied: true, from: location.pathname }}
        replace
      />
    )
  }

  return children
}

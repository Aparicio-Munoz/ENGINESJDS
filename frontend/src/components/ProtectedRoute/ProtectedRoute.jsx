import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Loader } from '../Loader/Loader'
import { ROUTES } from '../../utils/routes'

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isAuthReady, user } = useAuth()
  const location = useLocation()

  if (!isAuthReady) return <Loader fullScreen label="Verificando sesión..." />

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace />
  }

  // Cuando vence un tenant SaaS, el backend sólo habilita /billing. Este
  // guard mantiene la misma restricción en la interfaz, incluso si el
  // usuario pega una URL operativa directamente.
  if (
    user?.tenantId
    && user.subscriptionActive === false
    && location.pathname !== ROUTES.adminSuscripcion
  ) {
    return <Navigate to={ROUTES.adminSuscripcion} replace />
  }

  return children
}

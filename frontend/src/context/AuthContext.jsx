import { useCallback, useMemo, useState } from 'react'
import { AuthContext } from './authContextValue'
import { authService } from '../services/authService'
import { authApi } from '../api/authApi'

const AUTH_KEY = 'engines-jds-auth'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => authService.getSession())

  const login = useCallback(async (credentials) => {
    const nextSession = await authService.login(credentials)
    setSession(nextSession)
    return nextSession
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setSession({ user: null, token: null })
  }, [])

  // Refresca los datos del usuario desde el backend (útil tras cambio de email/username)
  const refreshUser = useCallback(async () => {
    try {
      const fresh = await authApi.me()
      // Releer la sesión persistida para no pisar un access token recién renovado
      const latest = authService.getSession()
      const updated = { ...latest, user: fresh }
      localStorage.setItem(AUTH_KEY, JSON.stringify(updated))
      setSession(updated)
    } catch {
      // Si falla (token expirado, etc.) el interceptor de axios ya redirige a /login
    }
  }, [])

  const value = useMemo(
    () => ({
      user: session.user,
      token: session.token,
      isAuthenticated: Boolean(session.token),
      login,
      logout,
      refreshUser,
    }),
    [login, logout, refreshUser, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

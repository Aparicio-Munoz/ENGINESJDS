import { useCallback, useMemo, useState } from 'react'
import { AuthContext } from './authContextValue'
import { authService } from '../services/authService'

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

  const value = useMemo(
    () => ({
      user: session.user,
      token: session.token,
      isAuthenticated: Boolean(session.token),
      login,
      logout,
    }),
    [login, logout, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

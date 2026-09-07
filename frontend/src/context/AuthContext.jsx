import { useCallback, useEffect, useMemo, useState } from 'react'
import { authService } from '../services/authService'
import { authApi } from '../api/authApi'

import { AuthContext } from './AuthContextValue'

const AUTH_KEY = 'engines-jds-auth'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => authService.getSession())

  useEffect(() => {
    function onStorage(e) {
      if (e.key !== AUTH_KEY) return
      if (!e.newValue) {
        setSession({ user: null, token: null })
        return
      }
      try {
        setSession(JSON.parse(e.newValue))
      } catch {
        setSession({ user: null, token: null })
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const login = useCallback(async (credentials) => {
    const nextSession = await authService.login(credentials)
    setSession(nextSession)
    return nextSession
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setSession({ user: null, token: null })
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const fresh = await authApi.me()
      const latest = authService.getSession()
      const updated = { ...latest, user: fresh }
      localStorage.setItem(AUTH_KEY, JSON.stringify(updated))
      setSession(updated)
    } catch {
      // interceptor handles redirect
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

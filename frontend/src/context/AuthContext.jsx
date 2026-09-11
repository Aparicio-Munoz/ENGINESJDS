import { useCallback, useEffect, useMemo, useState } from 'react'
import { authService } from '../services/authService'
import { authApi } from '../api/authApi'
import { subscribeSessionEvents } from '../services/sessionEvents'

import { AuthContext } from './AuthContextValue'

const EMPTY_SESSION = { user: null }

function getHeartbeatIntervalMs() {
  const minutes = Number(import.meta.env.VITE_SESSION_HEARTBEAT_MINUTES ?? 5)
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60_000 : 300_000
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(EMPTY_SESSION)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const isAuthenticated = Boolean(session.user)

  useEffect(() => {
    authService.clearLegacySessionStorage()
    let mounted = true
    const unsubscribe = subscribeSessionEvents((event) => {
      if (!event || !['logout', 'expired'].includes(event.type)) return
      setSession(EMPTY_SESSION)
      // A local manual logout is followed by DashboardLayout navigation. Do
      // not reload before the revoke request has a chance to reach the API.
      if (event.type === 'logout' && event.local) return
      if (!window.location.pathname.startsWith('/login')) {
        const query = event.type === 'expired' ? '?reason=session-expired' : ''
        window.location.replace(`/login${query}`)
      }
    })

    authApi.me()
      .then((user) => { if (mounted) setSession({ user }) })
      .catch(() => { if (mounted) setSession(EMPTY_SESSION) })
      .finally(() => { if (mounted) setIsAuthReady(true) })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  // Keep an active user alive without sending a request for every mouse
  // movement. A heartbeat is sent only once per interval if there was recent
  // interaction; the backend still decides whether the session is valid.
  useEffect(() => {
    if (!isAuthenticated) return undefined

    const heartbeatIntervalMs = getHeartbeatIntervalMs()
    let lastActivityAt = Date.now()
    let lastHeartbeatAt = Date.now()
    let heartbeatInFlight = false

    const markActivity = () => {
      lastActivityAt = Date.now()
    }

    const sendHeartbeatIfActive = () => {
      const now = Date.now()
      const recentlyActive = now - lastActivityAt <= heartbeatIntervalMs
      const heartbeatDue = now - lastHeartbeatAt >= heartbeatIntervalMs
      if (!recentlyActive || !heartbeatDue || heartbeatInFlight || document.hidden) return

      heartbeatInFlight = true
      lastHeartbeatAt = now
      authApi.me().catch(() => {}).finally(() => { heartbeatInFlight = false })
    }

    const events = ['pointerdown', 'keydown', 'touchstart']
    events.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }))
    const heartbeatTimer = window.setInterval(sendHeartbeatIfActive, heartbeatIntervalMs)

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, markActivity))
      window.clearInterval(heartbeatTimer)
    }
  }, [isAuthenticated])

  const login = useCallback(async (credentials) => {
    const nextSession = await authService.login(credentials)
    setSession(nextSession)
    return nextSession
  }, [])

  const logout = useCallback(async () => {
    const request = authService.logout()
    setSession(EMPTY_SESSION)
    await request
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const fresh = await authApi.me()
      const updated = { user: fresh }
      setSession(updated)
    } catch {
      // interceptor handles redirect
    }
  }, [])

  const value = useMemo(
    () => ({
      user: session.user,
      isAuthenticated,
      isAuthReady,
      login,
      logout,
      refreshUser,
    }),
    [isAuthReady, isAuthenticated, login, logout, refreshUser, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

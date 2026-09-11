import { authApi } from '../api/authApi'
import { notifySessionEvent } from './sessionEvents'

const AUTH_STORAGE_KEY = 'engines-jds-auth'

function clearLegacySessionStorage() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    sessionStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    // Storage may be unavailable in a restricted browser context.
  }
}

export const authService = {
  async login(credentials) {
    // The backend sets the access and refresh cookies; only safe user data
    // remains in React memory.
    const { user } = await authApi.login(credentials)
    clearLegacySessionStorage()
    return { user }
  },

  logout() {
    // The server revokes the HttpOnly refresh cookie. Broadcast immediately
    // so other tabs stop rendering protected content as well.
    const request = authApi.logout().catch(() => {})
    notifySessionEvent('logout')
    clearLegacySessionStorage()
    return request
  },

  clearLegacySessionStorage,

}

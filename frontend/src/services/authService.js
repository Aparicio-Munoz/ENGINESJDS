import { authApi } from '../api/authApi'

const AUTH_STORAGE_KEY = 'engines-jds-auth'

export const authService = {
  async login(credentials) {
    // Calls POST /auth/login → { token, refreshToken, user }
    const { token, refreshToken, user } = await authApi.login(credentials)
    const session = { user, token, refreshToken }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
    return session
  },

  logout() {
    // Invalida el refresh token en el backend (best-effort) antes de limpiar
    const { refreshToken } = this.getSession()
    if (refreshToken) {
      authApi.logout(refreshToken).catch(() => { /* sesión local se limpia igual */ })
    }
    localStorage.removeItem(AUTH_STORAGE_KEY)
  },

  getSession() {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      return stored ? JSON.parse(stored) : { user: null, token: null }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return { user: null, token: null }
    }
  },
}

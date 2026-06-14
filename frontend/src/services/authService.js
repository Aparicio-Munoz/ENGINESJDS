import { authApi } from '../api/authApi'

const AUTH_STORAGE_KEY = 'engines-jds-auth'

export const authService = {
  async login(credentials) {
    // Calls POST /auth/login → { token, user }
    const { token, user } = await authApi.login(credentials)
    const session = { user, token }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
    return session
  },

  logout() {
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

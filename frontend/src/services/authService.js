const AUTH_STORAGE_KEY = 'engines-jds-auth'

function createMockToken(email) {
  return `mock-jwt-${btoa(`${email}:${Date.now()}`)}`
}

export const authService = {
  login({ email, password }) {
    if (!email || !password) {
      throw new Error('Ingresa email y contrasena para continuar.')
    }

    const user = {
      id: crypto.randomUUID(),
      name: email.split('@')[0],
      email,
    }
    const token = createMockToken(email)
    const session = { user, token }

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))

    return session
  },

  logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  },

  getSession() {
    const storedSession = localStorage.getItem(AUTH_STORAGE_KEY)

    if (!storedSession) {
      return { user: null, token: null }
    }

    try {
      return JSON.parse(storedSession)
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return { user: null, token: null }
    }
  },
}

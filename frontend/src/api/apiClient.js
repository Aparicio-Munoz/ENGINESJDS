import axios from 'axios'

const AUTH_KEY = 'engines-jds-auth'

function resolveBaseURL() {
  const env = import.meta.env.VITE_API_BASE_URL
  if (env) return env
  const { protocol, hostname } = window.location
  return `${protocol}//${hostname}:3000/api`
}

export const apiClient = axios.create({
  baseURL: resolveBaseURL(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// ── Helpers de sesión (localStorage) ─────────────────────
function readSession() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeSession(session) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session))
}

function clearSessionAndRedirect() {
  localStorage.removeItem(AUTH_KEY)
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login'
  }
}

// ── Request: attach JWT access token ──────────────────────
apiClient.interceptors.request.use((config) => {
  const session = readSession()
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`
  }
  return config
})

// ── Refresh single-flight ─────────────────────────────────
// Si varias peticiones reciben 401 a la vez, solo se dispara
// un refresh; todas esperan la misma promesa.
let refreshPromise = null

async function doRefresh() {
  const session = readSession()
  const refreshToken = session?.refreshToken
  if (!refreshToken) throw new Error('Sin refresh token')

  // El endpoint /auth/refresh está excluido del reintento (ver isAuthEndpoint)
  const res = await apiClient.post('/auth/refresh', { refreshToken })
  const newToken = res.data?.data?.token
  if (!newToken) throw new Error('Respuesta de refresh inválida')

  writeSession({ ...session, token: newToken })
  return newToken
}

function getRefreshedToken() {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

function isAuthEndpoint(url = '') {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout')
  )
}

// ── Response: refresh-on-401 + normalización de errores ───
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config ?? {}
    const status = error.response?.status

    // Normalizar mensaje desde { success: false, message }
    const apiMessage = error.response?.data?.message || error.response?.data?.error?.message
    if (apiMessage) error.message = apiMessage

    const authCall = isAuthEndpoint(original.url)

    // 401 en petición protegida → intentar renovar el access token una vez
    if (status === 401 && !authCall && !original._retry) {
      original._retry = true
      try {
        const newToken = await getRefreshedToken()
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` }
        return apiClient(original)
      } catch {
        clearSessionAndRedirect()
        return Promise.reject(error)
      }
    }

    // 401 tras reintento fallido en petición protegida → cerrar sesión
    if (status === 401 && !authCall) {
      clearSessionAndRedirect()
    }

    return Promise.reject(error)
  },
)

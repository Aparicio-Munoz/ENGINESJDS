import axios from 'axios'
import { notifySessionEvent } from '../services/sessionEvents'

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
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  if (config.sessionActivity === false) {
    config.headers = { ...config.headers, 'X-Session-Activity': '0' }
    delete config.sessionActivity
  }
  return config
})

function clearSessionAndRedirect() {
  notifySessionEvent('expired')
}

// ── Refresh single-flight ─────────────────────────────────
// Si varias peticiones reciben 401 a la vez, solo se dispara
// un refresh; todas esperan la misma promesa.
let refreshPromise = null

async function doRefresh(shouldTouchSession = true) {
  // El endpoint /auth/refresh está excluido del reintento (ver isAuthEndpoint)
  const config = shouldTouchSession ? undefined : { sessionActivity: false }
  await apiClient.post('/auth/refresh', undefined, config)
  return true
}

function getRefreshedToken(shouldTouchSession) {
  if (!refreshPromise) {
    refreshPromise = doRefresh(shouldTouchSession).finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

function requestCountsAsActivity(config) {
  const headers = config?.headers
  if (!headers) return true
  if (typeof headers.get === 'function') {
    return headers.get('X-Session-Activity') !== '0'
  }
  return headers['X-Session-Activity'] !== '0' && headers['x-session-activity'] !== '0'
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
    const publicCall = original.url?.includes('/public/')

    // 401 en petición protegida → intentar renovar el access token una vez
    if (status === 401 && !authCall && !publicCall && !original._retry) {
      original._retry = true
      try {
        await getRefreshedToken(requestCountsAsActivity(original))
        return apiClient(original)
      } catch {
        clearSessionAndRedirect()
        return Promise.reject(error)
      }
    }

    // 401 tras reintento fallido en petición protegida → cerrar sesión
    if (status === 401 && !authCall && !publicCall) {
      clearSessionAndRedirect()
    }

    return Promise.reject(error)
  },
)

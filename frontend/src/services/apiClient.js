import axios from 'axios'

function resolveBaseURL() {
  const env = import.meta.env.VITE_API_BASE_URL
  if (env) return env
  const { protocol, hostname } = window.location
  return `${protocol}//${hostname}:3000/api`
}

export const apiClient = axios.create({
  baseURL: resolveBaseURL(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// ── Auth interceptor ─────────────────────────────────
// Attach JWT token on every request once backend is live.
apiClient.interceptors.request.use((config) => {
  const raw = localStorage.getItem('engines-jds-auth')
  if (raw) {
    try {
      const { token } = JSON.parse(raw)
      if (token) config.headers.Authorization = `Bearer ${token}`
    } catch {
      // corrupted session — ignore
    }
  }
  return config
})

// ── Response interceptor ─────────────────────────────
// When backend returns 401, redirect to /login.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('engines-jds-auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// ── Request: attach JWT ───────────────────────────────────
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

// ── Response: normalize errors + 401 redirect ────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract message from backend ApiError format: { error: { message, code } }
    const apiMessage = error.response?.data?.error?.message
    if (apiMessage) error.message = apiMessage

    // 401 → session expired, redirect to login
    // Skip if the failed request IS the login call itself (invalid credentials)
    const isLoginCall = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !isLoginCall) {
      localStorage.removeItem('engines-jds-auth')
      window.location.href = '/login'
    }

    return Promise.reject(error)
  },
)

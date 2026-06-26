import { apiClient } from './apiClient'

export const authApi = {
  // POST /auth/login → { token, refreshToken, user }
  login(credentials) {
    return apiClient.post('/auth/login', credentials).then((r) => r.data.data)
  },

  // POST /auth/refresh → { token, user }
  refresh(refreshToken) {
    return apiClient.post('/auth/refresh', { refreshToken }).then((r) => r.data.data)
  },

  // POST /auth/logout → invalida el refresh token
  logout(refreshToken) {
    return apiClient.post('/auth/logout', { refreshToken }).then((r) => r.data)
  },

  // GET /auth/me → user
  me() {
    return apiClient.get('/auth/me').then((r) => r.data.data)
  },

  // PUT /auth/change-password
  changePassword(data) {
    return apiClient.put('/auth/change-password', data).then((r) => r.data)
  },

  // GET /auth/registration-status → { allowed: boolean }
  registrationStatus() {
    return apiClient.get('/auth/registration-status').then((r) => r.data.data)
  },

  // POST /auth/public-register
  publicRegister(data) {
    return apiClient.post('/auth/public-register', data).then((r) => r.data)
  },
}

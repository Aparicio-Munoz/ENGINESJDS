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

  // POST /auth/forgot-password
  forgotPassword(email) {
    return apiClient.post('/auth/forgot-password', { email }).then((r) => r.data)
  },

  // POST /auth/reset-password → { code, newPassword }
  resetPassword({ code, newPassword }) {
    return apiClient.post('/auth/reset-password', { code, newPassword }).then((r) => r.data)
  },
}

import { apiClient } from './apiClient'

export const authApi = {
  // POST /auth/login → { token, user }
  login(credentials) {
    return apiClient.post('/auth/login', credentials).then((r) => r.data.data)
  },

  // GET /auth/me → user
  me() {
    return apiClient.get('/auth/me').then((r) => r.data.data)
  },

  // PUT /auth/change-password
  changePassword(data) {
    return apiClient.put('/auth/change-password', data).then((r) => r.data)
  },

  // PUT /auth/change-username
  changeUsername(data) {
    return apiClient.put('/auth/change-username', data).then((r) => r.data)
  },
}

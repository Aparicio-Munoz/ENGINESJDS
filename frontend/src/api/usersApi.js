import { apiClient } from './apiClient'

export const usersApi = {
  // GET /users?search=&role=&status=&page=&limit=
  getAll(params = {}) {
    return apiClient.get('/users', { params }).then((r) => r.data)
  },

  // GET /users/:id
  getById(id) {
    return apiClient.get(`/users/${id}`).then((r) => r.data.data)
  },

  // POST /users — requires: username, email, password, role_id
  create(data) {
    return apiClient.post('/users', data).then((r) => r.data.data)
  },

  // PUT /users/:id
  update(id, data) {
    return apiClient.put(`/users/${id}`, data).then((r) => r.data.data)
  },

  // DELETE /users/:id — requires body { reason }
  remove(id, reason) {
    return apiClient.delete(`/users/${id}`, { data: { reason } }).then((r) => r.data)
  },

  // PUT /users/:id/toggle-status
  toggleStatus(id, data) {
    return apiClient.put(`/users/${id}/toggle-status`, data).then((r) => r.data.data)
  },
}

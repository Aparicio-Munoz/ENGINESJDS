import { apiClient } from './apiClient'

export const clientsApi = {
  // GET /clients?search=&page=&limit=&sort=
  // Returns { data: [...], pagination: {...} }
  getAll(params = {}) {
    return apiClient.get('/clients', { params }).then((r) => r.data)
  },

  // GET /clients/:id
  getById(id) {
    return apiClient.get(`/clients/${id}`).then((r) => r.data.data)
  },

  // POST /clients
  create(data) {
    return apiClient.post('/clients', data).then((r) => r.data.data)
  },

  // PUT /clients/:id
  update(id, data) {
    return apiClient.put(`/clients/${id}`, data).then((r) => r.data.data)
  },

  // DELETE /clients/:id (soft delete)
  remove(id, reason) {
    return apiClient.delete(`/clients/${id}`, { data: { reason } }).then((r) => r.data)
  },
}

import { apiClient } from './apiClient'

export const motorcyclesApi = {
  // GET /motorcycles?search=&brand=&status=&client_id=&page=&limit=&sort=
  getAll(params = {}) {
    return apiClient.get('/motorcycles', { params }).then((r) => r.data)
  },

  // GET /motorcycles/brands — lista de marcas únicas
  getBrands() {
    return apiClient.get('/motorcycles/brands').then((r) => r.data.data)
  },

  // GET /motorcycles/:id
  getById(id) {
    return apiClient.get(`/motorcycles/${id}`).then((r) => r.data.data)
  },

  // GET /motorcycles/:id/history → { motorcycle, appointments, orders, tecnomecanica }
  getHistory(id) {
    return apiClient.get(`/motorcycles/${id}/history`).then((r) => r.data.data)
  },

  // POST /motorcycles — requires: client_id, plate, brand, model, year
  create(data) {
    return apiClient.post('/motorcycles', data).then((r) => r.data.data)
  },

  // PUT /motorcycles/:id
  update(id, data) {
    return apiClient.put(`/motorcycles/${id}`, data).then((r) => r.data.data)
  },

  // DELETE /motorcycles/:id (soft delete) — requires body { reason }
  remove(id, reason) {
    return apiClient.delete(`/motorcycles/${id}`, { data: { reason } }).then((r) => r.data)
  },
}

import { apiClient } from './apiClient'

export const inventoryApi = {
  // GET /inventory?search=&category=&brand=&status=&sort=&page=&limit=
  getAll(params = {}) {
    return apiClient.get('/inventory', { params }).then((r) => r.data)
  },

  // GET /inventory/categories
  getCategories() {
    return apiClient.get('/inventory/categories').then((r) => r.data.data)
  },

  // GET /inventory/brands
  getBrands() {
    return apiClient.get('/inventory/brands').then((r) => r.data.data)
  },

  // GET /inventory/alerts?status= (optional: 'Agotado' | 'Stock bajo')
  getAlerts(params = {}) {
    return apiClient.get('/inventory/alerts', { params }).then((r) => r.data.data)
  },

  // GET /inventory/:id
  getById(id) {
    return apiClient.get(`/inventory/${id}`).then((r) => r.data.data)
  },

  // GET /inventory/:id/movements?page=&limit=
  getMovements(id, params = {}) {
    return apiClient.get(`/inventory/${id}/movements`, { params }).then((r) => r.data)
  },

  // POST /inventory — requires: code, name, brand, category, quantity, min_stock, unit_price, sale_price
  create(data) {
    return apiClient.post('/inventory', data).then((r) => r.data.data)
  },

  // PUT /inventory/:id
  update(id, data) {
    return apiClient.put(`/inventory/${id}`, data).then((r) => r.data.data)
  },

  // DELETE /inventory/:id — requires body { reason }
  remove(id, reason) {
    return apiClient.delete(`/inventory/${id}`, { data: { reason } }).then((r) => r.data)
  },

  // POST /inventory/:id/entry — { qty, notes? }
  recordEntry(id, data) {
    return apiClient.post(`/inventory/${id}/entry`, data).then((r) => r.data.data)
  },

  // POST /inventory/:id/output — { qty, notes? }
  recordOutput(id, data) {
    return apiClient.post(`/inventory/${id}/output`, data).then((r) => r.data.data)
  },

  // POST /inventory/:id/adjustment — { quantity, notes? }
  recordAdjustment(id, data) {
    return apiClient.post(`/inventory/${id}/adjustment`, data).then((r) => r.data.data)
  },
}

import { apiClient } from './apiClient'

export const brandsApi = {
  // GET /brands?search=&category=&status=&sort=&page=&limit=
  getAll(params = {}) {
    return apiClient.get('/brands', { params }).then((r) => r.data)
  },

  // GET /brands/categories
  getCategories() {
    return apiClient.get('/brands/categories').then((r) => r.data.data)
  },

  // GET /brands/:id
  getById(id) {
    return apiClient.get(`/brands/${id}`).then((r) => r.data.data)
  },

  // POST /brands — { name, category, price, status? }
  create(data) {
    return apiClient.post('/brands', data).then((r) => r.data.data)
  },

  // PUT /brands/:id — { name?, category?, price?, status? }
  update(id, data) {
    return apiClient.put(`/brands/${id}`, data).then((r) => r.data.data)
  },

  // DELETE /brands/:id
  remove(id) {
    return apiClient.delete(`/brands/${id}`).then((r) => r.data)
  },
}

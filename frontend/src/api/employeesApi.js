import { apiClient } from './apiClient'

export const employeesApi = {
  // GET /employees?search=&specialty=&status=&sort=&page=&limit=
  getAll(params = {}) {
    return apiClient.get('/employees', { params }).then((r) => r.data)
  },

  // GET /employees/specialties → string[]
  getSpecialties() {
    return apiClient.get('/employees/specialties').then((r) => r.data.data)
  },

  // GET /employees/:id
  getById(id) {
    return apiClient.get(`/employees/${id}`).then((r) => r.data.data)
  },

  // GET /employees/:id/performance
  getPerformance(id) {
    return apiClient.get(`/employees/${id}/performance`).then((r) => r.data.data)
  },

  // POST /employees — requires: document_type, document, hire_date, name, last_name, specialty, phone
  create(data) {
    return apiClient.post('/employees', data).then((r) => r.data.data)
  },

  // PUT /employees/:id
  update(id, data) {
    return apiClient.put(`/employees/${id}`, data).then((r) => r.data.data)
  },

  // DELETE /employees/:id (soft delete) — requires body { reason }
  remove(id, reason) {
    return apiClient.delete(`/employees/${id}`, { data: { reason } }).then((r) => r.data)
  },
}

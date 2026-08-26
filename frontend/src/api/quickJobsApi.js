import { apiClient } from './apiClient'

export const quickJobsApi = {
  // GET /quick-jobs?employee_id=&from=&to=&page=&limit=
  getAll(params = {}) {
    return apiClient.get('/quick-jobs', { params }).then((r) => r.data)
  },

  // POST /quick-jobs   body: { description, price, employee_id }
  create(data) {
    return apiClient.post('/quick-jobs', data).then((r) => r.data.data)
  },

  // DELETE /quick-jobs/:id
  remove(id) {
    return apiClient.delete(`/quick-jobs/${id}`).then((r) => r.data)
  },
}

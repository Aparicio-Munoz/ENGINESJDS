import { apiClient } from './apiClient'

export const remindersApi = {
  getAll(params = {}) {
    return apiClient.get('/reminders', { params }).then((r) => r.data)
  },
  getById(id) {
    return apiClient.get(`/reminders/${id}`).then((r) => r.data.data)
  },
  create(data) {
    return apiClient.post('/reminders', data).then((r) => r.data.data)
  },
  update(id, data) {
    return apiClient.put(`/reminders/${id}`, data).then((r) => r.data.data)
  },
  remove(id) {
    return apiClient.delete(`/reminders/${id}`).then((r) => r.data)
  },
  send(id) {
    return apiClient.post(`/reminders/send/${id}`).then((r) => r.data.data)
  },
  getDashboard() {
    return apiClient.get('/reminders/dashboard').then((r) => r.data.data)
  },
}

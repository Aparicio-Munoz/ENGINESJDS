import { apiClient } from './apiClient'

export const technicianApi = {
  getDashboard() {
    return apiClient.get('/technician/dashboard').then((r) => r.data.data)
  },

  getOrders(params = {}) {
    return apiClient.get('/technician/orders', { params }).then((r) => r.data)
  },

  updateOrderStatus(id, data) {
    return apiClient.put(`/technician/orders/${id}/status`, data).then((r) => r.data.data)
  },

  updateOrderNotes(id, data) {
    return apiClient.put(`/technician/orders/${id}/notes`, data).then((r) => r.data.data)
  },

  getMotorcycles() {
    return apiClient.get('/technician/motorcycles').then((r) => r.data.data)
  },

  getPartRequests(params = {}) {
    return apiClient.get('/technician/part-requests', { params }).then((r) => r.data)
  },

  createPartRequest(data) {
    return apiClient.post('/technician/part-requests', data).then((r) => r.data.data)
  },

  getEarnings() {
    return apiClient.get('/technician/earnings').then((r) => r.data.data)
  },
}

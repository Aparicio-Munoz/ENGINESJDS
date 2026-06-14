import { apiClient } from './apiClient'

export const appointmentsApi = {
  // GET /appointments?search=&status=&date=&client_id=&motorcycle_id=&sort=&page=&limit=
  getAll(params = {}) {
    return apiClient.get('/appointments', { params }).then((r) => r.data)
  },

  // GET /appointments/:id
  getById(id) {
    return apiClient.get(`/appointments/${id}`).then((r) => r.data.data)
  },

  // GET /appointments/:id/history → { appointment, reschedules, client, motorcycle }
  getHistory(id) {
    return apiClient.get(`/appointments/${id}/history`).then((r) => r.data.data)
  },

  // GET /appointments/today
  getToday() {
    return apiClient.get('/appointments/today').then((r) => r.data.data)
  },

  // POST /appointments (ruta pública)
  create(data) {
    return apiClient.post('/appointments', data).then((r) => r.data.data)
  },

  // PUT /appointments/:id — actualiza service_type, notes, assigned_employee_id
  update(id, data) {
    return apiClient.put(`/appointments/${id}`, data).then((r) => r.data.data)
  },

  // DELETE /appointments/:id [Administrador] — requiere body { reason }
  remove(id, reason) {
    return apiClient.delete(`/appointments/${id}`, { data: { reason } }).then((r) => r.data)
  },

  // POST /appointments/:id/confirm — Pendiente | Reprogramada → Confirmada
  confirm(id) {
    return apiClient.post(`/appointments/${id}/confirm`).then((r) => r.data.data)
  },

  // POST /appointments/:id/cancel — body: { reason? } → Cancelada
  cancel(id, reason) {
    return apiClient.post(`/appointments/${id}/cancel`, { reason: reason || undefined }).then((r) => r.data.data)
  },

  // POST /appointments/:id/reschedule — body: { new_date, new_time, reason, notes? }
  reschedule(id, data) {
    return apiClient.post(`/appointments/${id}/reschedule`, data).then((r) => r.data.data)
  },
}

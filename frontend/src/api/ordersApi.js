import { apiClient } from './apiClient'

export const ordersApi = {
  // GET /orders?search=&status=&employee_id=&client_id=&motorcycle_id=&date_from=&date_to=&sort=&page=&limit=
  getAll(params = {}) {
    return apiClient.get('/orders', { params }).then((r) => r.data)
  },

  // GET /orders/active — órdenes no Entregadas
  getActive() {
    return apiClient.get('/orders/active').then((r) => r.data.data)
  },

  // GET /orders/service-catalog — servicios disponibles para agregar a la orden
  getServiceCatalog() {
    return apiClient.get('/orders/service-catalog').then((r) => r.data.data)
  },

  // GET /orders/:id
  getById(id) {
    return apiClient.get(`/orders/${id}`).then((r) => r.data.data)
  },

  // GET /orders/:id/history → { order, status_history, services, parts, sale }
  getHistory(id) {
    return apiClient.get(`/orders/${id}/history`).then((r) => r.data.data)
  },

  // POST /orders — { client_id, motorcycle_id, problem_description, assigned_employee_id?, ... }
  create(data) {
    return apiClient.post('/orders', data).then((r) => r.data.data)
  },

  // PUT /orders/:id — { assigned_employee_id?, diagnostic_notes?, work_notes?, labor_cost?, discount? }
  update(id, data) {
    return apiClient.put(`/orders/${id}`, data).then((r) => r.data.data)
  },

  // DELETE /orders/:id [Administrador] — { reason }
  remove(id, reason) {
    return apiClient.delete(`/orders/${id}`, { data: { reason } }).then((r) => r.data)
  },

  // POST /orders/:id/change-status — { status: 'Pendiente'|'En proceso'|'Listo', notes? }
  // Note: status Entregada is blocked here — use close() instead
  changeStatus(id, data) {
    return apiClient.post(`/orders/${id}/change-status`, data).then((r) => r.data.data)
  },

  // POST /orders/:id/close — { payment_method?, payment_status?, notes? }
  // Marca orden Entregada, crea sales, marca cita Atendida
  close(id, data = {}) {
    return apiClient.post(`/orders/${id}/close`, data).then((r) => r.data.data)
  },

  // POST /orders/:id/add-service — { service_catalog_id?, service_name?, unit_price?, quantity?, employee_id? }
  addService(id, data) {
    return apiClient.post(`/orders/${id}/add-service`, data).then((r) => r.data.data)
  },

  // DELETE /orders/:id/services/:serviceId
  removeService(id, serviceId) {
    return apiClient.delete(`/orders/${id}/services/${serviceId}`).then((r) => r.data)
  },

  // POST /orders/:id/add-part — { inventory_id, quantity }
  addPart(id, data) {
    return apiClient.post(`/orders/${id}/add-part`, data).then((r) => r.data.data)
  },

  // DELETE /orders/:id/parts/:itemId
  removePart(id, itemId) {
    return apiClient.delete(`/orders/${id}/parts/${itemId}`).then((r) => r.data)
  },

  // GET /orders/:id/pdf → descarga el PDF de la orden
  async downloadPDF(id) {
    const res = await apiClient.get(`/orders/${id}/pdf`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `OT_${id}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  },
}

import { apiClient } from './apiClient'

export const reportsApi = {
  // GET /reports/summary → { activeOrders, appointmentsToday, lowStockItems, ... }
  getSummary() {
    return apiClient.get('/reports/summary').then((r) => r.data.data)
  },

  // GET /reports/orders?period=daily|weekly|biweekly|monthly
  getOrdersByPeriod(period = 'monthly') {
    return apiClient.get('/reports/orders', { params: { period } }).then((r) => r.data.data)
  },

  // GET /reports/top-parts?limit=10
  getTopParts(limit = 10) {
    return apiClient.get('/reports/top-parts', { params: { limit } }).then((r) => r.data.data)
  },

  // GET /reports/employees
  getEmployeeStats() {
    return apiClient.get('/reports/employees').then((r) => r.data.data)
  },

  // GET /reports/tecnomecanica → { summary, items }
  getTecnomecanica() {
    return apiClient.get('/reports/tecnomecanica').then((r) => r.data.data)
  },

  // GET /reports/inventory-alerts → { summary, items }
  getInventoryAlerts() {
    return apiClient.get('/reports/inventory-alerts').then((r) => r.data.data)
  },
}

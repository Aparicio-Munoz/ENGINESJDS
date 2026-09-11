import { apiClient } from './apiClient'
import { downloadBlob } from '../utils/downloadBlob'

export const invoicesApi = {
  getAll(params = {}) {
    return apiClient.get('/invoices', { params }).then((r) => r.data)
  },

  getById(id) {
    return apiClient.get(`/invoices/${id}`).then((r) => r.data.data)
  },

  create(data) {
    return apiClient.post('/invoices', data).then((r) => r.data.data)
  },

  markPaid(id) {
    return apiClient.put(`/invoices/${id}/pay`).then((r) => r.data.data)
  },

  cancel(id) {
    return apiClient.put(`/invoices/${id}/cancel`).then((r) => r.data.data)
  },

  getDailySummary(date, config = {}) {
    const params = date ? { date } : {}
    return apiClient.get('/invoices/daily-summary', { ...config, params }).then((r) => r.data.data)
  },

  async downloadPDF(id) {
    const res = await apiClient.get(`/invoices/${id}/pdf`, { responseType: 'blob' })
    downloadBlob(res.data, `factura_${id}.pdf`)
  },
}

import { apiClient } from './apiClient'
import { downloadBlob } from '../utils/downloadBlob'

export const historyApi = {
  getFullHistory(motorcycleId) {
    return apiClient.get(`/history/motorcycle/${motorcycleId}`).then((r) => r.data.data)
  },

  getStats(motorcycleId) {
    return apiClient.get(`/history/motorcycle/${motorcycleId}/stats`).then((r) => r.data.data)
  },

  getTimeline(motorcycleId) {
    return apiClient.get(`/history/motorcycle/${motorcycleId}/timeline`).then((r) => r.data.data)
  },

  async downloadPDF(motorcycleId) {
    const res = await apiClient.get(`/history/motorcycle/${motorcycleId}/pdf`, { responseType: 'blob' })
    downloadBlob(res.data, `historial_moto_${motorcycleId}.pdf`)
  },
}

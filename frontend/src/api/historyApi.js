import { apiClient } from './apiClient'

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
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url; a.download = `historial_moto_${motorcycleId}.pdf`; a.click()
    URL.revokeObjectURL(url)
  },
}

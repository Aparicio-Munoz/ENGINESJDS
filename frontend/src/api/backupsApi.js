import { apiClient } from './apiClient'

export const backupsApi = {
  getAll(params = {}) {
    return apiClient.get('/backups', { params }).then((r) => r.data)
  },

  getStats() {
    return apiClient.get('/backups/stats').then((r) => r.data.data)
  },

  create() {
    return apiClient.post('/backups/create').then((r) => r.data.data)
  },

  restore(file) {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post('/backups/restore', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }).then((r) => r.data)
  },

  getDownloadUrl(id) {
    const base = apiClient.defaults.baseURL
    return `${base}/backups/download/${id}`
  },

  async download(id) {
    const res = await apiClient.get(`/backups/download/${id}`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const disposition = res.headers['content-disposition'] || ''
    const match = disposition.match(/filename="?(.+?)"?$/)
    const filename = match ? match[1] : `backup_${id}.sql`
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  },

  remove(id) {
    return apiClient.delete(`/backups/${id}`).then((r) => r.data)
  },
}

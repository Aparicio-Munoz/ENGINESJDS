import { apiClient } from './apiClient'

export const settingsApi = {
  get() {
    return apiClient.get('/settings').then((r) => r.data.data)
  },
  update(data) {
    return apiClient.put('/settings', data).then((r) => r.data.data)
  },
  uploadLogo(file) {
    const fd = new FormData()
    fd.append('logo', file)
    return apiClient.post('/settings/logo', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data)
  },
}

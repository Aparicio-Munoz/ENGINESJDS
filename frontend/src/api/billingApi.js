import { apiClient } from './apiClient'

export const billingApi = {
  getStatus() {
    return apiClient.get('/billing/status').then((r) => r.data.data)
  },

  createCheckout() {
    return apiClient.post('/billing/checkout').then((r) => r.data.data)
  },
}

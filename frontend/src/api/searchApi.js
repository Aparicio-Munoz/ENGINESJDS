import { apiClient } from './apiClient'

export const searchApi = {
  search(query, signal) {
    return apiClient.get('/search', { params: { q: query }, signal }).then((response) => response.data.data)
  },
}

const KEY = 'engines_jds_clients'

export function getClients(fallback) {
  try {
    const stored = localStorage.getItem(KEY)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

export function saveClients(clients) {
  localStorage.setItem(KEY, JSON.stringify(clients))
}

const KEY = 'engines_jds_users'

export function getUsers(fallback) {
  try {
    const stored = localStorage.getItem(KEY)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

export function saveUsers(users) {
  localStorage.setItem(KEY, JSON.stringify(users))
}

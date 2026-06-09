const KEY = 'engines_jds_motorcycles'

export function getMotorcycles(fallback) {
  try {
    const stored = localStorage.getItem(KEY)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

export function saveMotorcycles(motorcycles) {
  localStorage.setItem(KEY, JSON.stringify(motorcycles))
}

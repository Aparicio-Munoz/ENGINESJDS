const KEY = 'engines_jds_inventory'

export function getInventory(fallback) {
  try {
    const stored = localStorage.getItem(KEY)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

export function saveInventory(items) {
  localStorage.setItem(KEY, JSON.stringify(items))
}

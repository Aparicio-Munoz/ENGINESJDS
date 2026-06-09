const KEY = 'engines_jds_orders'

export function getOrders(fallback) {
  try {
    const stored = localStorage.getItem(KEY)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

export function saveOrders(orders) {
  localStorage.setItem(KEY, JSON.stringify(orders))
}

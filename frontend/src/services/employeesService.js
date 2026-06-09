const KEY = 'engines_jds_employees'

export function getEmployees(fallback) {
  try {
    const stored = localStorage.getItem(KEY)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

export function saveEmployees(employees) {
  localStorage.setItem(KEY, JSON.stringify(employees))
}

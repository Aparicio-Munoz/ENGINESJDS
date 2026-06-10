const KEY = 'engines_jds_appointments'

export function getAppointments(fallback = []) {
  try {
    const stored = localStorage.getItem(KEY)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

export function saveAppointments(appointments) {
  localStorage.setItem(KEY, JSON.stringify(appointments))
}

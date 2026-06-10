import { getAppointments, saveAppointments } from '../services/appointmentsService'

export const appointmentsApi = {
  getAll() {
    return Promise.resolve(getAppointments([]))
  },
  getById(id) {
    return Promise.resolve(getAppointments([]).find((a) => a.id === id) ?? null)
  },
  create(data) {
    const items = getAppointments([])
    const item = { id: crypto.randomUUID(), ...data }
    saveAppointments([item, ...items])
    return Promise.resolve(item)
  },
  update(id, data) {
    const items = getAppointments([]).map((a) => (a.id === id ? { ...a, ...data } : a))
    saveAppointments(items)
    return Promise.resolve(items.find((a) => a.id === id) ?? null)
  },
  remove(id) {
    saveAppointments(getAppointments([]).filter((a) => a.id !== id))
    return Promise.resolve()
  },
}

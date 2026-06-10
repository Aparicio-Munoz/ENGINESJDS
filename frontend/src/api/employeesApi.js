import { getEmployees, saveEmployees } from '../services/employeesService'

export const employeesApi = {
  getAll() {
    return Promise.resolve(getEmployees([]))
  },
  getById(id) {
    return Promise.resolve(getEmployees([]).find((e) => e.id === id) ?? null)
  },
  create(data) {
    const items = getEmployees([])
    const item = { id: crypto.randomUUID(), ...data }
    saveEmployees([item, ...items])
    return Promise.resolve(item)
  },
  update(id, data) {
    const items = getEmployees([]).map((e) => (e.id === id ? { ...e, ...data } : e))
    saveEmployees(items)
    return Promise.resolve(items.find((e) => e.id === id) ?? null)
  },
  remove(id) {
    saveEmployees(getEmployees([]).filter((e) => e.id !== id))
    return Promise.resolve()
  },
}

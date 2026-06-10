import { getMotorcycles, saveMotorcycles } from '../services/motorcyclesService'

export const motorcyclesApi = {
  getAll() {
    return Promise.resolve(getMotorcycles([]))
  },
  getById(id) {
    return Promise.resolve(getMotorcycles([]).find((m) => m.id === id) ?? null)
  },
  create(data) {
    const items = getMotorcycles([])
    const item = { id: crypto.randomUUID(), ...data }
    saveMotorcycles([item, ...items])
    return Promise.resolve(item)
  },
  update(id, data) {
    const items = getMotorcycles([]).map((m) => (m.id === id ? { ...m, ...data } : m))
    saveMotorcycles(items)
    return Promise.resolve(items.find((m) => m.id === id) ?? null)
  },
  remove(id) {
    saveMotorcycles(getMotorcycles([]).filter((m) => m.id !== id))
    return Promise.resolve()
  },
}

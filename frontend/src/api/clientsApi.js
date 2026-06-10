import { getClients, saveClients } from '../services/clientsService'

export const clientsApi = {
  getAll() {
    return Promise.resolve(getClients([]))
  },
  getById(id) {
    return Promise.resolve(getClients([]).find((c) => c.id === id) ?? null)
  },
  create(data) {
    const items = getClients([])
    const item = { id: crypto.randomUUID(), ...data }
    saveClients([item, ...items])
    return Promise.resolve(item)
  },
  update(id, data) {
    const items = getClients([]).map((c) => (c.id === id ? { ...c, ...data } : c))
    saveClients(items)
    return Promise.resolve(items.find((c) => c.id === id) ?? null)
  },
  remove(id) {
    saveClients(getClients([]).filter((c) => c.id !== id))
    return Promise.resolve()
  },
}

import { getInventory, saveInventory } from '../services/inventoryService'

export const inventoryApi = {
  getAll() {
    return Promise.resolve(getInventory([]))
  },
  getById(id) {
    return Promise.resolve(getInventory([]).find((i) => i.id === id) ?? null)
  },
  create(data) {
    const items = getInventory([])
    const item = { id: crypto.randomUUID(), ...data }
    saveInventory([item, ...items])
    return Promise.resolve(item)
  },
  update(id, data) {
    const items = getInventory([]).map((i) => (i.id === id ? { ...i, ...data } : i))
    saveInventory(items)
    return Promise.resolve(items.find((i) => i.id === id) ?? null)
  },
  remove(id) {
    saveInventory(getInventory([]).filter((i) => i.id !== id))
    return Promise.resolve()
  },
}

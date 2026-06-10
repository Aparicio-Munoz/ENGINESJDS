import { getOrders, saveOrders } from '../services/ordersService'

export const ordersApi = {
  getAll() {
    return Promise.resolve(getOrders([]))
  },
  getById(id) {
    return Promise.resolve(getOrders([]).find((o) => o.id === id) ?? null)
  },
  create(data) {
    const items = getOrders([])
    const item = { id: crypto.randomUUID(), ...data }
    saveOrders([item, ...items])
    return Promise.resolve(item)
  },
  update(id, data) {
    const items = getOrders([]).map((o) => (o.id === id ? { ...o, ...data } : o))
    saveOrders(items)
    return Promise.resolve(items.find((o) => o.id === id) ?? null)
  },
  remove(id) {
    saveOrders(getOrders([]).filter((o) => o.id !== id))
    return Promise.resolve()
  },
}

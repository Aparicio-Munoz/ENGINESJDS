import { getUsers, saveUsers } from '../services/usersService'

export const usersApi = {
  getAll() {
    return Promise.resolve(getUsers([]))
  },
  getById(id) {
    return Promise.resolve(getUsers([]).find((u) => u.id === id) ?? null)
  },
  create(data) {
    const items = getUsers([])
    const item = { id: crypto.randomUUID(), ...data }
    saveUsers([item, ...items])
    return Promise.resolve(item)
  },
  update(id, data) {
    const items = getUsers([]).map((u) => (u.id === id ? { ...u, ...data } : u))
    saveUsers(items)
    return Promise.resolve(items.find((u) => u.id === id) ?? null)
  },
  remove(id) {
    saveUsers(getUsers([]).filter((u) => u.id !== id))
    return Promise.resolve()
  },
}

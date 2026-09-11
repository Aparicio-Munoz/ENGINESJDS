import { AsyncLocalStorage } from 'node:async_hooks'

const storage = new AsyncLocalStorage()

export function requestContextMiddleware(_req, _res, next) {
  storage.run({ tenant: null }, next)
}

export function getTenantContext() {
  return storage.getStore()?.tenant ?? null
}

export function setTenantContext(tenant) {
  const context = storage.getStore()
  if (context) context.tenant = tenant
}

export function runWithTenantContext(tenant, callback) {
  return storage.run({ tenant }, callback)
}

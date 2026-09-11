import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  getAuthCookieOptions,
  parseCookies,
  setAuthCookies,
} from '../src/utils/authCookies.js'
import { isSessionExpired, validateSession } from '../src/services/session.service.js'

function withEnvironment(values, callback) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]))
  Object.assign(process.env, values)
  return Promise.resolve(callback()).finally(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })
}

test('las cookies de autenticación son HttpOnly y de sesión', async () => {
  await withEnvironment({
    NODE_ENV: 'production',
    AUTH_COOKIE_SAME_SITE: 'none',
    AUTH_COOKIE_DOMAIN: '',
  }, () => {
    const options = getAuthCookieOptions()
    assert.equal(options.httpOnly, true)
    assert.equal(options.secure, true)
    assert.equal(options.sameSite, 'none')
    assert.equal(options.path, '/')
    assert.equal('expires' in options, false)
    assert.equal('maxAge' in options, false)

    const cookies = []
    setAuthCookies({ cookie: (...args) => cookies.push(args) }, { accessToken: 'a', refreshToken: 'r' })
    assert.deepEqual(cookies.map(([name]) => name), [ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME])
    assert.equal('expires' in cookies[0][2], false)
    assert.equal('maxAge' in cookies[0][2], false)
  })
})

test('las cookies se pueden leer sin exponer tokens al frontend', () => {
  assert.deepEqual(parseCookies('sgtm_access=access%20value; sgtm_refresh=refresh.value'), {
    sgtm_access: 'access value',
    sgtm_refresh: 'refresh.value',
  })
})

test('el timeout de sesión es configurable y usa la última actividad', async () => {
  await withEnvironment({ SESSION_IDLE_TIMEOUT_MINUTES: '1', SESSION_ACTIVITY_UPDATE_MINUTES: '1' }, async () => {
    const now = Date.now()
    assert.equal(isSessionExpired(new Date(now - 59_999), now), false)
    assert.equal(isSessionExpired(new Date(now - 60_000), now), true)

    const revoked = []
    await assert.rejects(
      validateSession('refresh', { tokenModel: {
        hashToken: (value) => `hash:${value}`,
        findValid: async () => ({ id: 7, user_id: 3, last_activity: new Date(now - 60_001) }),
        revokeById: async (id) => revoked.push(id),
        touchActivity: async () => {},
      } }),
      /inactividad/
    )
    assert.deepEqual(revoked, [7])
  })
})

test('una sesión activa actualiza last_activity sólo cuando corresponde', async () => {
  await withEnvironment({ SESSION_IDLE_TIMEOUT_MINUTES: '5', SESSION_ACTIVITY_UPDATE_MINUTES: '1' }, async () => {
    const touched = []
    const record = await validateSession('refresh', { tokenModel: {
      hashToken: (value) => `hash:${value}`,
      findValid: async (hash) => ({ id: 8, user_id: 3, token_hash: hash, last_activity: new Date(Date.now() - 90_000) }),
      revokeById: async () => {},
      touchActivity: async (id) => touched.push(id),
    } })
    assert.equal(record.id, 8)
    assert.deepEqual(touched, [8])
  })
})

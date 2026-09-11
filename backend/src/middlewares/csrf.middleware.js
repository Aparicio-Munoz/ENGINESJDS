import { ApiError } from '../utils/ApiError.js'
import { isProductionEnvironment } from '../utils/authCookies.js'
import { parseCookies, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../utils/authCookies.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function allowedOrigins() {
  return (process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function isAllowedOrigin(origin) {
  if (!origin) return false
  if (allowedOrigins().includes(origin)) return true

  if (!isProductionEnvironment()) {
    return /:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(origin)
  }

  return false
}

function getRequestOrigin(req) {
  const origin = req.get('origin')
  if (origin) return origin

  const referer = req.get('referer')
  if (!referer) return null
  try { return new URL(referer).origin } catch { return null }
}

export function csrfProtection(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next()

  const cookies = parseCookies(req.headers.cookie)
  const hasAuthCookie = Boolean(cookies[ACCESS_COOKIE_NAME] || cookies[REFRESH_COOKIE_NAME])
  if (!hasAuthCookie) return next()

  const origin = getRequestOrigin(req)
  if (isAllowedOrigin(origin)) return next()

  // Local command-line/API tests do not send Origin. Production browser
  // requests with cookies must identify a trusted frontend origin.
  if (!origin && !isProductionEnvironment()) return next()

  return next(ApiError.forbidden('Origen no permitido para esta sesión'))
}

export const ACCESS_COOKIE_NAME = 'sgtm_access'
export const REFRESH_COOKIE_NAME = 'sgtm_refresh'

const VALID_SAME_SITE = new Set(['strict', 'lax', 'none'])

export function isProductionEnvironment() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
}

function getSameSite() {
  const configured = String(process.env.AUTH_COOKIE_SAME_SITE ?? '').trim().toLowerCase()
  if (VALID_SAME_SITE.has(configured)) {
    // SameSite=None only works over HTTPS. In local HTTP development, use
    // Lax so browsers do not silently reject the cookie.
    return !isProductionEnvironment() && configured === 'none' ? 'lax' : configured
  }

  // The deployed frontend and API are separate Vercel applications, so
  // cross-site requests require None + Secure in production. Same-site
  // deployments can set AUTH_COOKIE_SAME_SITE=lax.
  return isProductionEnvironment() ? 'none' : 'lax'
}

export function getAuthCookieOptions() {
  const domain = String(process.env.AUTH_COOKIE_DOMAIN ?? '').trim()
  return {
    httpOnly: true,
    secure: isProductionEnvironment(),
    sameSite: getSameSite(),
    path: '/',
    ...(domain ? { domain } : {}),
  }
}

function decodeCookieValue(value) {
  try { return decodeURIComponent(value) } catch { return value }
}

export function parseCookies(header = '') {
  return String(header).split(';').reduce((cookies, part) => {
    const separator = part.indexOf('=')
    if (separator < 1) return cookies
    const name = part.slice(0, separator).trim()
    const value = part.slice(separator + 1).trim()
    cookies[name] = decodeCookieValue(value)
    return cookies
  }, {})
}

export function getAccessToken(req) {
  return parseCookies(req.headers.cookie)[ACCESS_COOKIE_NAME] ?? null
}

export function getRefreshToken(req) {
  return parseCookies(req.headers.cookie)[REFRESH_COOKIE_NAME] ?? null
}

export function setAuthCookies(res, { accessToken, refreshToken } = {}) {
  const options = getAuthCookieOptions()
  if (accessToken) res.cookie(ACCESS_COOKIE_NAME, accessToken, options)
  if (refreshToken) res.cookie(REFRESH_COOKIE_NAME, refreshToken, options)
}

export function clearAccessCookie(res) {
  res.clearCookie(ACCESS_COOKIE_NAME, getAuthCookieOptions())
}

export function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, getAuthCookieOptions())
}

export function clearAuthCookies(res) {
  clearAccessCookie(res)
  clearRefreshCookie(res)
}

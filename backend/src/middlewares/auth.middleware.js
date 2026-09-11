import jwt from 'jsonwebtoken'
import { ApiError } from '../utils/ApiError.js'
import { isSaaSEnabled } from '../config/saas.js'
import { setTenantContext } from '../config/requestContext.js'
import * as PlatformModel from '../models/platform.model.js'
import * as RefreshTokenModel from '../models/refreshToken.model.js'
import { clearAccessCookie, clearAuthCookies, getAccessToken, getRefreshToken } from '../utils/authCookies.js'
import { validateSession } from '../services/session.service.js'

export function tenantTokenMatches(tenant, payload) {
  return Boolean(
    tenant
    && payload?.tenantId === tenant.id
    && payload?.tenantDatabaseName === tenant.database_name
  )
}

export async function verifyToken(req, res, next) {
  const token = getAccessToken(req)

  if (!token) {
    clearAccessCookie(res)
    return next(ApiError.unauthorized('Sesión no encontrada — inicia sesión nuevamente'))
  }

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Token expirado'
      : 'Token inválido'
    clearAccessCookie(res)
    return next(ApiError.unauthorized(message))
  }

  try {
    if (payload.tenantId) {
      if (!isSaaSEnabled()) {
        return next(ApiError.unauthorized('La sesión SaaS no está disponible'))
      }

      const tenant = await PlatformModel.findTenantById(payload.tenantId)
      const hasAccess = PlatformModel.tenantHasAccess(tenant)
      const billingRoute = req.originalUrl.includes('/billing/')
      if (
        !tenant ||
        !tenantTokenMatches(tenant, payload) ||
        (!hasAccess && !billingRoute) ||
        !PlatformModel.tenantCanManageBilling(tenant)
      ) {
        return next(ApiError.forbidden('La suscripción del taller no está activa'))
      }

      setTenantContext({
        tenantId: tenant.id,
        databaseName: tenant.database_name,
        slug: tenant.slug,
        subscriptionActive: hasAccess,
        subscriptionStatus: tenant.subscription_status,
      })
    }

    try {
      const session = await validateSession(getRefreshToken(req), {
        touch: req.headers['x-session-activity'] !== '0',
      })
      if (Number(session.user_id) !== Number(payload.id)) {
        clearAuthCookies(res)
        await RefreshTokenModel.revokeById(session.id)
        return next(ApiError.unauthorized('Sesión inválida — inicia sesión nuevamente'))
      }
      req.authSession = session
      req.user = payload
      next()
    } catch (error) {
      clearAuthCookies(res)
      next(error)
    }
  } catch (error) {
    next(error)
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized())
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden())
    next()
  }
}

// Alias semántico — misma lógica, nombre más expresivo para nuevas rutas
export const authorizeRoles = requireRole

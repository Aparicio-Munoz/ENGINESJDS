import jwt from 'jsonwebtoken'
import { ApiError } from '../utils/ApiError.js'

export function verifyToken(req, _res, next) {
  const header = req.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Token no proporcionado'))
  }

  const token = header.slice(7)

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = payload
    next()
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Token expirado'
      : 'Token inválido'
    next(ApiError.unauthorized(message))
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

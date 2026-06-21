import { ApiError } from '../utils/ApiError.js'
import { logger } from '../utils/logger.js'

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError && err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors.length ? { errors: err.errors } : {}),
    })
  }

  logger.error('Error no manejado', {
    message: err.message,
    stack:   err.stack,
    method:  req.method,
    url:     req.originalUrl,
  })

  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message,
  })
}

export class ApiError extends Error {
  constructor(message, statusCode = 500, errors = []) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.errors = errors
    this.isOperational = true
  }

  static badRequest(message = 'Solicitud inválida', errors = []) {
    return new ApiError(message, 400, errors)
  }

  static unauthorized(message = 'No autorizado') {
    return new ApiError(message, 401)
  }

  static forbidden(message = 'Acceso denegado') {
    return new ApiError(message, 403)
  }

  static notFound(message = 'Recurso no encontrado') {
    return new ApiError(message, 404)
  }

  static conflict(message = 'Conflicto de datos') {
    return new ApiError(message, 409)
  }

  static internal(message = 'Error interno del servidor') {
    return new ApiError(message, 500)
  }

  static tooManyRequests(message = 'Demasiadas solicitudes') {
    return new ApiError(message, 429)
  }
}

import { rateLimit } from 'express-rate-limit'

// Respuesta 429 con la misma forma que errorHandler.js, para que el
// frontend (apiClient.js) la trate igual que cualquier otro error de la API.
function tooManyRequestsHandler(_req, res) {
  res.status(429).json({
    success: false,
    message: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.',
  })
}

// Backstop general para toda /api — solo frena flujos de flood/DoS reales.
// Umbral alto a propósito: varios usuarios del taller (recepción, técnicos,
// admin) comparten la IP de la red local y cada sesión hace polling propio
// (SocketContext cada 25s, DashboardAdmin cada 30s), así que el uso normal
// nunca debería acercarse a este límite.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequestsHandler,
})

// Endpoints públicos sin autenticación (/api/public/*): el mayor riesgo de
// abuso porque no requieren login. Generoso para no afectar el polling
// legítimo de /tracking/:token (cada 8s).
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequestsHandler,
})

// Flujo de recuperación de contraseña por OTP (forgot-password, verify-code,
// reset-password): comparten el mismo contador por IP para que un atacante
// no lo evada repartiendo intentos entre las tres rutas.
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequestsHandler,
})

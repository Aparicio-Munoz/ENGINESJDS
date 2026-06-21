import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import { checkBlockedIp } from '../middlewares/security.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import {
  loginRules,
  registerRules,
  changePasswordRules,
  forgotPasswordRules,
  resetPasswordRules,
} from '../validations/auth.validation.js'
import * as AuthController from '../controllers/auth.controller.js'

const router = Router()

// ── Rate limiters ─────────────────────────────────────────────
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes de recuperación. Intenta nuevamente en unos minutos.',
  },
})

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos de verificación. Intenta nuevamente en unos minutos.',
  },
})

// ── Rutas públicas ────────────────────────────────────────────
// POST /api/auth/login
//   checkBlockedIp rechaza la IP si está bloqueada (5 fallos → 15 min).
//   El desbloqueo es automático al expirar el periodo.
router.post('/login', checkBlockedIp, loginRules, validate, AuthController.login)

// POST /api/auth/refresh → Renueva el access token con un refresh token válido
router.post('/refresh', AuthController.refresh)

// POST /api/auth/logout → Invalida el refresh token recibido
router.post('/logout', AuthController.logout)

// POST /api/auth/forgot-password → Genera código 6 dígitos y envía email
router.post('/forgot-password', forgotLimiter, forgotPasswordRules, validate, AuthController.forgotPassword)

// POST /api/auth/reset-password → Recibe { code, newPassword } y actualiza contraseña
router.post('/reset-password', resetLimiter, resetPasswordRules, validate, AuthController.resetPassword)

// ── Requieren sesión activa ───────────────────────────────────
// GET  /api/auth/me
router.get('/me', verifyToken, AuthController.me)

// PUT  /api/auth/change-password
router.put(
  '/change-password',
  verifyToken,
  changePasswordRules,
  validate,
  AuthController.changePassword
)

// ── Solo Administrador ────────────────────────────────────────
// POST /api/auth/register
router.post(
  '/register',
  verifyToken,
  requireRole('Administrador'),
  registerRules,
  validate,
  AuthController.register
)

export default router

import { Router } from 'express'
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import { checkBlockedIp } from '../middlewares/security.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { otpLimiter } from '../middlewares/rateLimit.middleware.js'
import {
  loginRules,
  registerRules,
  publicRegisterRules,
  changePasswordRules,
} from '../validations/auth.validation.js'
import {
  forgotPasswordRules,
  verifyCodeRules,
  resetPasswordRules,
} from '../validations/passwordReset.validation.js'
import * as AuthController from '../controllers/auth.controller.js'
import * as PasswordResetController from '../controllers/passwordReset.controller.js'

const router = Router()

// POST /api/auth/login
router.post('/login', checkBlockedIp, loginRules, validate, AuthController.login)

// POST /api/auth/refresh
router.post('/refresh', AuthController.refresh)

// POST /api/auth/logout
router.post('/logout', AuthController.logout)

// GET  /api/auth/registration-status
router.get('/registration-status', AuthController.getRegistrationStatus)

// POST /api/auth/public-register
router.post('/public-register', publicRegisterRules, validate, AuthController.publicRegister)

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  otpLimiter,
  forgotPasswordRules,
  validate,
  PasswordResetController.forgotPassword
)

// POST /api/auth/verify-code
router.post('/verify-code', otpLimiter, verifyCodeRules, validate, PasswordResetController.verifyCode)

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  otpLimiter,
  resetPasswordRules,
  validate,
  PasswordResetController.resetPassword
)

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

// POST /api/auth/register  (solo Administrador)
router.post(
  '/register',
  verifyToken,
  requireRole('Administrador'),
  registerRules,
  validate,
  AuthController.register
)

export default router

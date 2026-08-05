import bcrypt from 'bcryptjs'
import * as UserModel from '../models/user.model.js'
import * as VerificationCodeModel from '../models/verificationCode.model.js'
import { ApiError } from '../utils/ApiError.js'
import { generateOTP, hashOTP, verifyOTP } from '../utils/otp.js'
import { sendPasswordResetCode } from '../utils/mailer.js'
import { logger } from '../utils/logger.js'
import { logAudit } from './audit.service.js'

const TYPE = 'password_reset'
const OTP_EXPIRES_MINUTES = Number(process.env.OTP_EXPIRES_MINUTES ?? 10)
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 5)
const INVALID_CODE_MESSAGE = 'Código inválido o expirado'

// ── Busca el código activo de un usuario y valida su OTP ─────
// Centraliza la verificación para reutilizarla en verifyCode y resetPassword.
async function validateCode(email, code) {
  const user = await UserModel.findByEmail(email)
  if (!user) throw ApiError.badRequest(INVALID_CODE_MESSAGE)

  const record = await VerificationCodeModel.findActive({ userId: user.id, type: TYPE })
  if (!record) throw ApiError.badRequest(INVALID_CODE_MESSAGE)

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await VerificationCodeModel.deleteByUserAndType(user.id, TYPE)
    throw ApiError.badRequest('Se superó el número máximo de intentos. Solicita un nuevo código.')
  }

  if (!verifyOTP(code, record.code_hash)) {
    await VerificationCodeModel.incrementAttempts(record.id)
    throw ApiError.badRequest(INVALID_CODE_MESSAGE)
  }

  return { user, record }
}

// ── Paso 1: solicitar código de recuperación ──────────────────
// Siempre resuelve exitosamente — nunca revela si el correo existe.
export async function forgotPassword(email, ip = null) {
  const user = await UserModel.findByEmail(email)
  if (!user) return

  await VerificationCodeModel.deleteByUserAndType(user.id, TYPE)

  const otp = generateOTP()
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60_000)
  await VerificationCodeModel.create({
    userId: user.id,
    type: TYPE,
    codeHash: hashOTP(otp),
    expiresAt,
  })

  try {
    await sendPasswordResetCode(user.email, otp, user.username)
  } catch (err) {
    logger.error('Error al enviar el correo de recuperación', { userId: user.id, message: err.message })
  }

  await logAudit('RECUPERACION_CONTRASENA', {
    userId: user.id,
    userName: user.username,
    role: user.role,
    ip,
    description: 'Código OTP de recuperación de contraseña solicitado',
  })
}

// ── Paso 2: verificar el código antes de mostrar el formulario ─
export async function verifyCode(email, code) {
  await validateCode(email, code)
}

// ── Paso 3: verificar el código y actualizar la contraseña ────
export async function resetPassword(email, code, newPassword, ip = null) {
  const { user, record } = await validateCode(email, code)

  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12)
  const passwordHash = await bcrypt.hash(newPassword, rounds)

  await UserModel.updatePassword(user.id, passwordHash)
  await VerificationCodeModel.markAsUsed(record.id)

  await logAudit('CAMBIO_CONTRASENA', {
    userId: user.id,
    userName: user.username,
    role: user.role,
    ip,
    details: { via: 'recuperacion_otp' },
  })
}

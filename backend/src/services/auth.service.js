import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getPool } from '../config/database.js'
import * as UserModel from '../models/user.model.js'
import * as LoginAttemptModel from '../models/loginAttempt.model.js'
import * as RefreshTokenModel from '../models/refreshToken.model.js'
import { ApiError } from '../utils/ApiError.js'
import { logger } from '../utils/logger.js'
import { sendPasswordResetCode } from './email.service.js'
import { logAudit } from './audit.service.js'

// ── Configuración de tokens y bloqueo ────────────────────────
const ACCESS_EXPIRES_IN  = process.env.JWT_ACCESS_EXPIRES_IN  ?? '15m'
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d'
const MAX_ATTEMPTS  = Number(process.env.LOGIN_MAX_ATTEMPTS  ?? 5)
const BLOCK_MINUTES = Number(process.env.LOGIN_BLOCK_MINUTES ?? 15)

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

function generate6DigitCode() {
  return String(crypto.randomInt(100000, 1000000))
}

// Convierte '15m' | '7d' | '24h' | '30s' a milisegundos
function parseDurationMs(str) {
  const match = String(str).match(/^(\d+)\s*([smhd])$/i)
  if (!match) return 7 * 24 * 60 * 60 * 1000 // fallback: 7 días
  const value = Number(match[1])
  const mult  = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2].toLowerCase()]
  return value * mult
}

// Genera access token (corto) + refresh token (opaco, persistido por hash)
async function issueTokens(user, ip = null) {
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  )

  const refreshToken = crypto.randomBytes(48).toString('hex')
  const tokenHash = RefreshTokenModel.hashToken(refreshToken)
  const expiresAt = new Date(Date.now() + parseDurationMs(REFRESH_EXPIRES_IN))

  await RefreshTokenModel.create({ userId: user.id, tokenHash, expiresAt, ip })

  return { token, refreshToken }
}

// Registra un intento fallido y lanza el error adecuado (401 o 429)
async function registerFailedAttempt(ip, email, userId = null) {
  const result = await LoginAttemptModel.recordFailure(ip, email, MAX_ATTEMPTS, BLOCK_MINUTES)
  await logAudit('LOGIN_FALLIDO', { userId, ip, details: { email, attempts: result.attempts } })

  if (result.blocked) {
    throw ApiError.tooManyRequests(
      `Demasiados intentos fallidos. IP bloqueada temporalmente por ${BLOCK_MINUTES} minutos.`
    )
  }
  throw ApiError.unauthorized(
    `Credenciales incorrectas. Te queda${result.remaining === 1 ? '' : 'n'} ${result.remaining} intento(s).`
  )
}

export async function login(email, password, ip = null) {
  const user = await UserModel.findByEmail(email)
  if (!user) {
    // Usuario inexistente: cuenta como intento fallido para el bloqueo de IP
    await registerFailedAttempt(ip, email)
  }

  const match = await bcrypt.compare(password, user.password_hash)
  if (!match) {
    await registerFailedAttempt(ip, email, user.id)
  }

  if (user.status !== 'Activo') {
    throw ApiError.forbidden('Cuenta desactivada — contacta al administrador')
  }

  // Login correcto → limpiar contador de intentos de la IP
  await LoginAttemptModel.reset(ip)
  await UserModel.updateLastLogin(user.id)
  await logAudit('LOGIN_EXITOSO', { userId: user.id, userName: user.username, role: user.role, ip, details: { email } })

  const { token, refreshToken } = await issueTokens(user, ip)

  const { password_hash, ...safeUser } = user
  return { token, refreshToken, user: safeUser }
}

// ── Renovar access token con un refresh token válido ─────────
export async function refresh(refreshToken, ip = null) {
  if (!refreshToken) {
    throw ApiError.unauthorized('Refresh token requerido')
  }

  const tokenHash = RefreshTokenModel.hashToken(refreshToken)
  const record = await RefreshTokenModel.findValid(tokenHash)
  if (!record) {
    throw ApiError.unauthorized('Sesión expirada — inicia sesión nuevamente')
  }

  const user = await UserModel.findById(record.user_id)
  if (!user || user.status !== 'Activo') {
    // Token huérfano o cuenta inactiva → revocar
    await RefreshTokenModel.revoke(tokenHash)
    throw ApiError.unauthorized('Sesión inválida — inicia sesión nuevamente')
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  )

  return { token, user }
}

// ── Cerrar sesión: invalidar el refresh token ────────────────
export async function logout(refreshToken, userId = null, ip = null) {
  if (refreshToken) {
    await RefreshTokenModel.revoke(RefreshTokenModel.hashToken(refreshToken))
  }
  await logAudit('LOGOUT', { userId, ip })
}

export async function register({ username, email, password, role = 'Técnico', status = 'Activo' }) {
  if (await UserModel.emailExists(email)) {
    throw ApiError.conflict('El correo electrónico ya está registrado')
  }
  if (await UserModel.usernameExists(username)) {
    throw ApiError.conflict('El nombre de usuario ya está en uso')
  }

  const roleRecord = await UserModel.findRoleByName(role)
  if (!roleRecord) throw ApiError.badRequest('Rol inválido')

  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12)
  const password_hash = await bcrypt.hash(password, rounds)

  return UserModel.create({ role_id: roleRecord.id, username, email, password_hash, status })
}

export async function findById(id) {
  const user = await UserModel.findById(id)
  if (!user) throw ApiError.notFound('Usuario no encontrado')
  return user
}

export async function changePassword(userId, currentPassword, newPassword, ip = null) {
  const [rows] = await getPool().query(
    'SELECT password_hash FROM users WHERE id = ?',
    [userId]
  )
  if (!rows.length) throw ApiError.notFound('Usuario no encontrado')

  const match = await bcrypt.compare(currentPassword, rows[0].password_hash)
  if (!match) throw ApiError.unauthorized('La contraseña actual es incorrecta')

  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12)
  const newHash = await bcrypt.hash(newPassword, rounds)
  await UserModel.updatePassword(userId, newHash)

  await logAudit('CAMBIO_CONTRASENA', { userId, ip, details: { via: 'cambio_directo' } })
}

const RESET_EXPIRES_MIN = Number(process.env.PASSWORD_RESET_EXPIRES_MIN ?? 10)
const MAX_CODE_ATTEMPTS = 5

export async function forgotPassword(email, ip = null) {
  const user = await UserModel.findByEmail(email)
  if (!user || user.status !== 'Activo') {
    await logAudit('RECUPERACION_CONTRASENA', { ip, details: { email, found: false } })
    return
  }

  const pool = getPool()

  await pool.query(
    'UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0',
    [user.id]
  )

  await pool.query(
    'DELETE FROM password_resets WHERE expires_at < NOW()',
  )

  const code = generate6DigitCode()
  const codeHash = sha256(code)

  await pool.query(
    `INSERT INTO password_resets (user_id, code, attempts, expires_at)
     VALUES (?, ?, 0, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [user.id, codeHash, RESET_EXPIRES_MIN]
  )

  try {
    await sendPasswordResetCode(user.email, code)
  } catch (err) {
    logger.error('No se pudo enviar correo de recuperación — el código fue generado pero no entregado', {
      userId: user.id, email, error: err.message,
    })
  }

  logger.info('Código de recuperación generado', {
    userId: user.id,
    email,
    expiresMin: RESET_EXPIRES_MIN,
  })
  await logAudit('RECUPERACION_CONTRASENA', { userId: user.id, ip, details: { email } })
}

function findValidCode(pool, codeHash) {
  return pool.query(
    `SELECT id, user_id, attempts
     FROM password_resets
     WHERE code = ? AND expires_at > NOW() AND used = 0
     LIMIT 1`,
    [codeHash]
  )
}

export async function verifyResetCode(code, ip = null) {
  const codeHash = sha256(code)
  const pool = getPool()
  const [rows] = await findValidCode(pool, codeHash)

  if (!rows.length) {
    await logAudit('CODIGO_INVALIDO', { ip, details: { reason: 'not_found_or_expired' } })
    throw ApiError.badRequest('El código es inválido o ha expirado')
  }

  const record = rows[0]

  if (record.attempts >= MAX_CODE_ATTEMPTS) {
    await pool.query('UPDATE password_resets SET used = 1 WHERE id = ?', [record.id])
    await logAudit('CODIGO_BLOQUEADO', { userId: record.user_id, ip, details: { attempts: record.attempts } })
    throw ApiError.tooManyRequests('Demasiados intentos. Solicita un nuevo código.')
  }

  return { valid: true }
}

export async function resetPassword(code, newPassword, ip = null) {
  const codeHash = sha256(code)
  const pool = getPool()
  const [rows] = await findValidCode(pool, codeHash)

  if (!rows.length) {
    await logAudit('RESET_FALLIDO', { ip, details: { reason: 'not_found_or_expired' } })
    throw ApiError.badRequest('El código es inválido o ha expirado')
  }

  const record = rows[0]

  if (record.attempts >= MAX_CODE_ATTEMPTS) {
    await pool.query('UPDATE password_resets SET used = 1 WHERE id = ?', [record.id])
    throw ApiError.tooManyRequests('Demasiados intentos. Solicita un nuevo código.')
  }

  await pool.query(
    'UPDATE password_resets SET attempts = attempts + 1 WHERE id = ?',
    [record.id]
  )

  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12)
  const newHash = await bcrypt.hash(newPassword, rounds)

  await UserModel.updatePassword(record.user_id, newHash)
  await pool.query('UPDATE password_resets SET used = 1 WHERE id = ?', [record.id])

  logger.info('Contraseña restablecida por código', { userId: record.user_id })
  await logAudit('CAMBIO_CONTRASENA', {
    userId: record.user_id,
    ip,
    details: { via: 'codigo_recuperacion' },
  })
}

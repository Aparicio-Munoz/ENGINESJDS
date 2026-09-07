import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getPool } from '../config/database.js'
import * as UserModel from '../models/user.model.js'
import * as LoginAttemptModel from '../models/loginAttempt.model.js'
import * as RefreshTokenModel from '../models/refreshToken.model.js'
import { ApiError } from '../utils/ApiError.js'
import { logAudit } from './audit.service.js'

// ── Configuración de tokens y bloqueo ────────────────────────
const ACCESS_EXPIRES_IN  = process.env.JWT_ACCESS_EXPIRES_IN  ?? '15m'
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d'
const MAX_ATTEMPTS  = Number(process.env.LOGIN_MAX_ATTEMPTS  ?? 5)
const BLOCK_MINUTES = Number(process.env.LOGIN_BLOCK_MINUTES ?? 15)

// Convierte '15m' | '7d' | '24h' | '30s' a milisegundos
function parseDurationMs(str) {
  const match = String(str).match(/^(\d+)\s*([smhd])$/i)
  if (!match) return 7 * 24 * 60 * 60 * 1000
  const value = Number(match[1])
  const mult  = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2].toLowerCase()]
  return value * mult
}

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
    await registerFailedAttempt(ip, email)
  }

  const match = await bcrypt.compare(password, user.password_hash)
  if (!match) {
    await registerFailedAttempt(ip, email, user.id)
  }

  if (user.status !== 'Activo') {
    throw ApiError.forbidden('Cuenta desactivada — contacta al administrador')
  }

  await LoginAttemptModel.reset(ip)
  await UserModel.updateLastLogin(user.id)
  await logAudit('LOGIN_EXITOSO', { userId: user.id, userName: user.username, role: user.role, ip, details: { email } })

  const { token, refreshToken } = await issueTokens(user, ip)

  const { password_hash, ...safeUser } = user
  return { token, refreshToken, user: safeUser }
}

export async function refresh(refreshToken, _ip = null) {
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

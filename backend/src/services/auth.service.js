import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getPool } from '../config/database.js'
import { isSaaSEnabled } from '../config/saas.js'
import { getTenantContext, runWithTenantContext } from '../config/requestContext.js'
import * as UserModel from '../models/user.model.js'
import * as LoginAttemptModel from '../models/loginAttempt.model.js'
import * as RefreshTokenModel from '../models/refreshToken.model.js'
import * as PlatformModel from '../models/platform.model.js'
import { ApiError } from '../utils/ApiError.js'
import { logAudit } from './audit.service.js'
import { validateSession } from './session.service.js'

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

function createAccessToken(user, tenant = null) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    username: user.username,
  }

  if (tenant) {
    payload.tenantId = tenant.id
    payload.tenantDatabaseName = tenant.database_name
    payload.tenantSlug = tenant.slug
  }

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN })
}

function parseTenantRefreshToken(refreshToken) {
  const match = String(refreshToken).match(/^t(\d+)\.(.+)$/)
  if (!match) return null
  return { tenantId: Number(match[1]) }
}

async function issueTokens(user, ip = null, tenant = null) {
  const token = createAccessToken(user, tenant)

  const randomToken = crypto.randomBytes(48).toString('hex')
  const refreshToken = tenant ? `t${tenant.id}.${randomToken}` : randomToken
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

async function authenticateUser(user, password, ip, {
  tenant = null,
  passwordHash = user?.password_hash,
  accountStatus = 'Activo',
  email = user?.email,
  subscriptionActive = true,
} = {}) {
  const attemptStatus = await LoginAttemptModel.getStatus(ip)
  if (attemptStatus.blocked) {
    const minutesLeft = Math.max(1, Math.ceil(attemptStatus.secondsLeft / 60))
    throw ApiError.tooManyRequests(
      `Demasiados intentos fallidos. IP bloqueada temporalmente. Intenta nuevamente en ${minutesLeft} minuto(s).`
    )
  }

  if (!user) {
    await registerFailedAttempt(ip, email)
  }

  const match = await bcrypt.compare(password, passwordHash)
  if (!match) {
    await registerFailedAttempt(ip, email, user.id)
  }

  if (user.status !== 'Activo' || accountStatus !== 'Activo') {
    throw ApiError.forbidden('Cuenta desactivada — contacta al administrador')
  }

  await LoginAttemptModel.reset(ip)
  await UserModel.updateLastLogin(user.id)
  await logAudit('LOGIN_EXITOSO', { userId: user.id, userName: user.username, role: user.role, ip, details: { email } })

  const { token, refreshToken } = await issueTokens(user, ip, tenant)

  const { password_hash, ...safeUser } = user
  return {
    token,
    refreshToken,
    user: tenant ? {
      ...safeUser,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      subscriptionActive,
      subscriptionStatus: tenant.subscriptionStatus,
    } : safeUser,
  }
}

async function loginLegacy(email, password, ip = null) {
  const user = await UserModel.findByEmail(email)
  if (!user) await registerFailedAttempt(ip, email)
  return authenticateUser(user, password, ip, { email })
}

async function loginTenant(account, password, ip = null) {
  if (!PlatformModel.tenantCanManageBilling(account)) {
    throw ApiError.forbidden('La suscripción del taller no está activa')
  }

  const tenant = {
    tenantId: account.tenant_id,
    id: account.tenant_id,
    databaseName: account.database_name,
    database_name: account.database_name,
    slug: account.slug,
    subscriptionStatus: account.subscription_status,
  }

  return runWithTenantContext(tenant, async () => {
    const user = await UserModel.findByEmail(account.email)
    if (!user) {
      throw ApiError.internal('La cuenta del taller no está inicializada correctamente')
    }

    return authenticateUser(user, password, ip, {
      tenant,
      passwordHash: account.password_hash,
      accountStatus: account.account_status,
      email: account.email,
      subscriptionActive: PlatformModel.tenantHasAccess(account),
    })
  })
}

export async function login(email, password, ip = null) {
  if (isSaaSEnabled()) {
    const account = await PlatformModel.findAccountByEmail(email)
    if (account) return loginTenant(account, password, ip)
  }

  return loginLegacy(email, password, ip)
}

async function refreshCurrentDatabase(refreshToken, tenant = null, { touch = true } = {}) {
  const tokenHash = RefreshTokenModel.hashToken(refreshToken)
  const record = await validateSession(refreshToken, { touch })

  const user = await UserModel.findById(record.user_id)
  if (!user || user.status !== 'Activo') {
    await RefreshTokenModel.revoke(tokenHash)
    throw ApiError.unauthorized('Sesión inválida — inicia sesión nuevamente')
  }

  return {
    token: createAccessToken(user, tenant),
    user: tenant?.slug ? {
      ...user,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      subscriptionActive: tenant.subscriptionActive ?? true,
      subscriptionStatus: tenant.subscriptionStatus,
    } : user,
  }
}

export async function refresh(refreshToken, _ip = null, { touch = true } = {}) {
  if (!refreshToken) {
    throw ApiError.unauthorized('Refresh token requerido')
  }

  const tenantToken = parseTenantRefreshToken(refreshToken)
  if (tenantToken && isSaaSEnabled()) {
    const tenantRecord = await PlatformModel.findTenantById(tenantToken.tenantId)
    if (!tenantRecord || !PlatformModel.tenantCanManageBilling(tenantRecord)) {
      throw ApiError.forbidden('La suscripción del taller no está activa')
    }

    return runWithTenantContext(
      {
        tenantId: tenantRecord.id,
        databaseName: tenantRecord.database_name,
        slug: tenantRecord.slug,
      },
      () => refreshCurrentDatabase(
        refreshToken,
        {
          id: tenantRecord.id,
          database_name: tenantRecord.database_name,
          slug: tenantRecord.slug,
          subscriptionActive: PlatformModel.tenantHasAccess(tenantRecord),
          subscriptionStatus: tenantRecord.subscription_status,
        },
        { touch },
      )
    )
  }

  return refreshCurrentDatabase(refreshToken, null, { touch })
}

export async function logout(refreshToken, userId = null, ip = null) {
  const tenantToken = refreshToken && parseTenantRefreshToken(refreshToken)

  if (tenantToken && isSaaSEnabled()) {
    const tenantRecord = await PlatformModel.findTenantById(tenantToken.tenantId)
    if (tenantRecord) {
      return runWithTenantContext(
        {
          tenantId: tenantRecord.id,
          databaseName: tenantRecord.database_name,
          slug: tenantRecord.slug,
          subscriptionActive: PlatformModel.tenantHasAccess(tenantRecord),
        },
        async () => {
          await RefreshTokenModel.revoke(RefreshTokenModel.hashToken(refreshToken))
          await logAudit('LOGOUT', { userId, ip })
        }
      )
    }
  }

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

  const user = await UserModel.create({ role_id: roleRecord.id, username, email, password_hash, status })
  const tenant = getTenantContext()

  if (tenant) {
    try {
      await PlatformModel.createAccount({
        tenantId: tenant.tenantId,
        username,
        email,
        passwordHash: password_hash,
        role,
        status,
      })
    } catch (error) {
      await UserModel.remove(user.id)
      throw error
    }
  }

  return user
}

export async function findById(id) {
  const user = await UserModel.findById(id)
  if (!user) throw ApiError.notFound('Usuario no encontrado')
  const tenant = getTenantContext()
  return tenant?.slug ? {
    ...user,
    tenantId: tenant.tenantId,
    tenantSlug: tenant.slug,
    subscriptionActive: tenant.subscriptionActive ?? true,
    subscriptionStatus: tenant.subscriptionStatus,
  } : user
}

export async function changePassword(userId, currentPassword, newPassword, ip = null) {
  const [rows] = await getPool().query(
    'SELECT password_hash, email FROM users WHERE id = ?',
    [userId]
  )
  if (!rows.length) throw ApiError.notFound('Usuario no encontrado')

  const match = await bcrypt.compare(currentPassword, rows[0].password_hash)
  if (!match) throw ApiError.unauthorized('La contraseña actual es incorrecta')

  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12)
  const newHash = await bcrypt.hash(newPassword, rounds)

  const tenant = getTenantContext()
  if (tenant) {
    await PlatformModel.updateAccountPassword(tenant.tenantId, rows[0].email, newHash)
  }
  await UserModel.updatePassword(userId, newHash)

  await logAudit('CAMBIO_CONTRASENA', { userId, ip, details: { via: 'cambio_directo' } })
}

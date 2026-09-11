import * as RefreshTokenModel from '../models/refreshToken.model.js'
import { ApiError } from '../utils/ApiError.js'

const DEFAULT_IDLE_TIMEOUT_MINUTES = 300
const DEFAULT_ACTIVITY_UPDATE_MINUTES = 5

function positiveMinutes(value, fallback) {
  const minutes = Number(value)
  return Number.isFinite(minutes) && minutes > 0 ? minutes : fallback
}

export function getSessionIdleTimeoutMinutes() {
  return positiveMinutes(process.env.SESSION_IDLE_TIMEOUT_MINUTES, DEFAULT_IDLE_TIMEOUT_MINUTES)
}

export function getSessionActivityUpdateMinutes() {
  return positiveMinutes(process.env.SESSION_ACTIVITY_UPDATE_MINUTES, DEFAULT_ACTIVITY_UPDATE_MINUTES)
}

export function isSessionExpired(lastActivity, now = Date.now()) {
  const lastActivityMs = new Date(lastActivity).getTime()
  if (!Number.isFinite(lastActivityMs)) return true
  return now - lastActivityMs >= getSessionIdleTimeoutMinutes() * 60_000
}

export async function validateSession(refreshToken, { tokenModel = RefreshTokenModel, touch = true } = {}) {
  if (!refreshToken) {
    throw ApiError.unauthorized('Sesión no encontrada — inicia sesión nuevamente')
  }

  const tokenHash = tokenModel.hashToken(refreshToken)
  const record = await tokenModel.findValid(tokenHash)
  if (!record) {
    throw ApiError.unauthorized('Sesión expirada — inicia sesión nuevamente')
  }

  const now = Date.now()
  if (isSessionExpired(record.last_activity, now)) {
    await tokenModel.revokeById(record.id)
    throw ApiError.unauthorized('Tu sesión expiró por inactividad. Inicia sesión nuevamente.')
  }

  const activityAge = now - new Date(record.last_activity).getTime()
  if (touch && activityAge >= getSessionActivityUpdateMinutes() * 60_000) {
    await tokenModel.touchActivity(record.id)
  }

  return record
}

import { ApiResponse } from '../utils/ApiResponse.js'
import * as AuthService from '../services/auth.service.js'
import * as SettingsModel from '../models/settings.model.js'
import { ApiError } from '../utils/ApiError.js'

export async function login(req, res, next) {
  try {
    const { email, password } = req.body
    const result = await AuthService.login(email, password, req.ip)
    ApiResponse.success(res, result, 'Sesión iniciada correctamente')
  } catch (err) {
    next(err)
  }
}

export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body
    const result = await AuthService.refresh(refreshToken, req.ip)
    ApiResponse.success(res, result, 'Token renovado')
  } catch (err) {
    next(err)
  }
}

export async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body
    await AuthService.logout(refreshToken, req.user?.id ?? null, req.ip)
    ApiResponse.success(res, null, 'Sesión cerrada correctamente')
  } catch (err) {
    next(err)
  }
}

export async function register(req, res, next) {
  try {
    const user = await AuthService.register(req.body)
    ApiResponse.created(res, user, 'Usuario registrado exitosamente')
  } catch (err) {
    next(err)
  }
}

export async function me(req, res, next) {
  try {
    const user = await AuthService.findById(req.user.id)
    ApiResponse.success(res, user)
  } catch (err) {
    next(err)
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body
    await AuthService.changePassword(req.user.id, currentPassword, newPassword, req.ip)
    ApiResponse.success(res, null, 'Contraseña actualizada correctamente')
  } catch (err) {
    next(err)
  }
}

export async function publicRegister(req, res, next) {
  try {
    const settings = await SettingsModel.get()
    if (!settings?.allow_public_registration) {
      throw ApiError.forbidden('El registro público no está habilitado')
    }
    const { username, email, password } = req.body
    const user = await AuthService.register({ username, email, password, role: 'Recepcionista' })
    ApiResponse.created(res, user, 'Cuenta creada exitosamente')
  } catch (err) {
    next(err)
  }
}

export async function getRegistrationStatus(_req, res) {
  const settings = await SettingsModel.get()
  res.json({ success: true, data: { allowed: Boolean(settings?.allow_public_registration) } })
}

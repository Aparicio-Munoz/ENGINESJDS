import { ApiResponse } from '../utils/ApiResponse.js'
import * as AuthService from '../services/auth.service.js'

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

export async function forgotPassword(req, res, next) {
  try {
    await AuthService.forgotPassword(req.body.email, req.ip)
    ApiResponse.success(res, null, 'Si el correo está registrado, recibirás un código en los próximos minutos')
  } catch (err) {
    next(err)
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { code, newPassword } = req.body
    await AuthService.resetPassword(code, newPassword, req.ip)
    ApiResponse.success(res, null, 'Contraseña restablecida correctamente')
  } catch (err) {
    next(err)
  }
}

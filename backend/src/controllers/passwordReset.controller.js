import { ApiResponse } from '../utils/ApiResponse.js'
import * as PasswordResetService from '../services/passwordReset.service.js'

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body
    await PasswordResetService.forgotPassword(email, req.ip)
    ApiResponse.success(res, null, 'Si el correo existe, recibirás un código de verificación')
  } catch (err) {
    next(err)
  }
}

export async function verifyCode(req, res, next) {
  try {
    const { email, code } = req.body
    await PasswordResetService.verifyCode(email, code)
    ApiResponse.success(res, null, 'Código verificado correctamente')
  } catch (err) {
    next(err)
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { email, code, newPassword } = req.body
    await PasswordResetService.resetPassword(email, code, newPassword, req.ip)
    ApiResponse.success(res, null, 'Contraseña restablecida correctamente')
  } catch (err) {
    next(err)
  }
}

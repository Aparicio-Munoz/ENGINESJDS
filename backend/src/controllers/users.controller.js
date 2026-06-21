import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import * as UserService from '../services/users.service.js'

export async function getAll(req, res, next) {
  try {
    const { search, role, status } = req.query
    const users = await UserService.getAll({ search, role, status })
    ApiResponse.success(res, users)
  } catch (err) {
    next(err)
  }
}

export async function getById(req, res, next) {
  try {
    const user = await UserService.getById(Number(req.params.id))
    ApiResponse.success(res, user)
  } catch (err) {
    next(err)
  }
}

export async function create(req, res, next) {
  try {
    const user = await UserService.create(req.body)
    ApiResponse.created(res, user, 'Usuario creado exitosamente')
  } catch (err) {
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const user = await UserService.update(Number(req.params.id), req.body)
    ApiResponse.success(res, user, 'Usuario actualizado correctamente')
  } catch (err) {
    next(err)
  }
}

export async function remove(req, res, next) {
  try {
    const { reason } = req.body
    if (!reason?.trim()) {
      return next(ApiError.badRequest('El motivo de eliminación es requerido'))
    }
    await UserService.remove(Number(req.params.id), req.user.id, reason)
    ApiResponse.noContent(res)
  } catch (err) {
    next(err)
  }
}

export async function resetPassword(req, res, next) {
  try {
    await UserService.resetPassword(Number(req.params.id), req.body.password)
    ApiResponse.success(res, null, 'Contraseña restablecida correctamente')
  } catch (err) {
    next(err)
  }
}

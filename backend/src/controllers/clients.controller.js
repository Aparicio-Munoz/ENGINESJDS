import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import * as ClientService from '../services/clients.service.js'

export async function getAll(req, res, next) {
  try {
    const { search, status, sort, page, limit } = req.query
    const result = await ClientService.getAll({ search, status, sort, page, limit })
    ApiResponse.paginated(res, result.data, result)
  } catch (err) {
    next(err)
  }
}

export async function getById(req, res, next) {
  try {
    const client = await ClientService.getById(Number(req.params.id))
    ApiResponse.success(res, client)
  } catch (err) {
    next(err)
  }
}

export async function create(req, res, next) {
  try {
    const actor = { userId: req.user.id, userName: req.user.username, role: req.user.role, ip: req.ip }
    const client = await ClientService.create(req.body, actor)
    ApiResponse.created(res, client, 'Cliente registrado exitosamente')
  } catch (err) {
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const actor = { userId: req.user.id, userName: req.user.username, role: req.user.role, ip: req.ip }
    const client = await ClientService.update(Number(req.params.id), req.body, actor)
    ApiResponse.success(res, client, 'Cliente actualizado correctamente')
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
    const actor = { userId: req.user.id, userName: req.user.username, role: req.user.role, ip: req.ip }
    await ClientService.remove(Number(req.params.id), req.user.id, reason, actor)
    ApiResponse.noContent(res)
  } catch (err) {
    next(err)
  }
}

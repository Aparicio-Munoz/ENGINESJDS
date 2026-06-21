import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import * as MotorcycleService from '../services/motorcycles.service.js'

export async function getAll(req, res, next) {
  try {
    const { search, brand, model, year, status, client_id, sort, page, limit } = req.query
    const result = await MotorcycleService.getAll({
      search, brand, model, year, status, client_id, sort, page, limit,
    })
    ApiResponse.paginated(res, result.data, result)
  } catch (err) {
    next(err)
  }
}

export async function getById(req, res, next) {
  try {
    const motorcycle = await MotorcycleService.getById(Number(req.params.id))
    ApiResponse.success(res, motorcycle)
  } catch (err) {
    next(err)
  }
}

export async function getHistory(req, res, next) {
  try {
    const history = await MotorcycleService.getHistory(Number(req.params.id))
    ApiResponse.success(res, history)
  } catch (err) {
    next(err)
  }
}

export async function getBrands(req, res, next) {
  try {
    const brands = await MotorcycleService.getBrands()
    ApiResponse.success(res, brands)
  } catch (err) {
    next(err)
  }
}

export async function create(req, res, next) {
  try {
    const actor = { userId: req.user.id, userName: req.user.username, role: req.user.role, ip: req.ip }
    const motorcycle = await MotorcycleService.create(req.body, actor)
    ApiResponse.created(res, motorcycle, 'Motocicleta registrada exitosamente')
  } catch (err) {
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const actor = { userId: req.user.id, userName: req.user.username, role: req.user.role, ip: req.ip }
    const motorcycle = await MotorcycleService.update(Number(req.params.id), req.body, actor)
    ApiResponse.success(res, motorcycle, 'Motocicleta actualizada correctamente')
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
    await MotorcycleService.remove(Number(req.params.id), req.user.id, reason, actor)
    ApiResponse.noContent(res)
  } catch (err) {
    next(err)
  }
}

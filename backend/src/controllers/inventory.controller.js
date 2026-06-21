import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import * as InventoryService from '../services/inventory.service.js'

export async function getAll(req, res, next) {
  try {
    const { search, category, brand, status, sort, page, limit } = req.query
    const result = await InventoryService.getAll({ search, category, brand, status, sort, page, limit })
    ApiResponse.paginated(res, result.data, result)
  } catch (err) {
    next(err)
  }
}

export async function getAlerts(req, res, next) {
  try {
    const { status } = req.query
    const alerts = await InventoryService.getAlerts({ status })
    ApiResponse.success(res, alerts)
  } catch (err) {
    next(err)
  }
}

export async function getCategories(_req, res, next) {
  try {
    const categories = await InventoryService.getCategories()
    ApiResponse.success(res, categories)
  } catch (err) {
    next(err)
  }
}

export async function getBrands(_req, res, next) {
  try {
    const brands = await InventoryService.getBrands()
    ApiResponse.success(res, brands)
  } catch (err) {
    next(err)
  }
}

export async function getById(req, res, next) {
  try {
    const item = await InventoryService.getById(Number(req.params.id))
    ApiResponse.success(res, item)
  } catch (err) {
    next(err)
  }
}

export async function getMovements(req, res, next) {
  try {
    const { page, limit } = req.query
    const result = await InventoryService.getMovements(Number(req.params.id), { page, limit })
    ApiResponse.paginated(res, result.data, result)
  } catch (err) {
    next(err)
  }
}

export async function create(req, res, next) {
  try {
    const item = await InventoryService.create(req.body)
    ApiResponse.created(res, item, 'Repuesto registrado exitosamente')
  } catch (err) {
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const actor = { userId: req.user.id, userName: req.user.username, role: req.user.role, ip: req.ip }
    const item = await InventoryService.update(Number(req.params.id), req.body, actor)
    ApiResponse.success(res, item, 'Repuesto actualizado correctamente')
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
    await InventoryService.remove(Number(req.params.id), req.user.id, reason, { ip: req.ip })
    ApiResponse.noContent(res)
  } catch (err) {
    next(err)
  }
}

// ── Movimientos manuales ─────────────────────────────────────
export async function recordEntry(req, res, next) {
  try {
    const { qty, notes } = req.body
    const result = await InventoryService.recordEntry(
      Number(req.params.id), qty, req.user.id, notes
    )
    ApiResponse.success(
      res, result,
      `Entrada registrada — stock anterior: ${result.quantityBefore}, nuevo: ${result.quantityAfter}`
    )
  } catch (err) {
    next(err)
  }
}

export async function recordOutput(req, res, next) {
  try {
    const { qty, notes } = req.body
    const result = await InventoryService.recordOutput(
      Number(req.params.id), qty, req.user.id, notes
    )
    ApiResponse.success(
      res, result,
      `Salida registrada — stock anterior: ${result.quantityBefore}, nuevo: ${result.quantityAfter}`
    )
  } catch (err) {
    next(err)
  }
}

export async function recordAdjustment(req, res, next) {
  try {
    const { quantity, notes } = req.body
    const result = await InventoryService.recordAdjustment(
      Number(req.params.id), quantity, req.user.id, notes
    )
    ApiResponse.success(
      res, result,
      `Ajuste registrado — stock anterior: ${result.quantityBefore}, nuevo: ${result.quantityAfter}`
    )
  } catch (err) {
    next(err)
  }
}

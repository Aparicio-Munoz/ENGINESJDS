import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import * as OrderService from '../services/orders.service.js'
import * as EmployeeModel from '../models/employee.model.js'

// ── Listados ──────────────────────────────────────────────────

export async function getAll(req, res, next) {
  try {
    const query = { ...req.query }

    // Un Técnico solo puede ver sus propias órdenes asignadas
    if (req.user.role === 'Técnico') {
      const employee = await EmployeeModel.findByUserId(req.user.id)
      query.employee_id = employee?.id ?? -1 // -1 → sin resultados si no tiene ficha de empleado
    }

    const result = await OrderService.getAll(query)
    ApiResponse.paginated(res, result.data, result)
  } catch (err) { next(err) }
}

export async function getActive(req, res, next) {
  try {
    const orders = await OrderService.getActive()
    ApiResponse.success(res, orders)
  } catch (err) { next(err) }
}

export async function getById(req, res, next) {
  try {
    const order = await OrderService.getById(Number(req.params.id))
    ApiResponse.success(res, order)
  } catch (err) { next(err) }
}

export async function getHistory(req, res, next) {
  try {
    const history = await OrderService.getHistory(Number(req.params.id))
    ApiResponse.success(res, history)
  } catch (err) { next(err) }
}

// ── CRUD ─────────────────────────────────────────────────────

export async function create(req, res, next) {
  try {
    const order = await OrderService.create(req.body, req.user.id, { userId: req.user.id, userName: req.user.username, role: req.user.role, ip: req.ip })
    ApiResponse.created(res, order, 'Orden de trabajo creada exitosamente')
  } catch (err) { next(err) }
}

export async function update(req, res, next) {
  try {
    const order = await OrderService.update(Number(req.params.id), req.body)
    ApiResponse.success(res, order, 'Orden actualizada correctamente')
  } catch (err) { next(err) }
}

export async function remove(req, res, next) {
  try {
    const { reason } = req.body
    if (!reason?.trim()) {
      return next(ApiError.badRequest('El motivo de eliminación es requerido'))
    }
    await OrderService.remove(Number(req.params.id), req.user.id, reason)
    ApiResponse.noContent(res)
  } catch (err) { next(err) }
}

// ── Transiciones de estado ────────────────────────────────────

export async function changeStatus(req, res, next) {
  try {
    const { status, notes } = req.body
    const order = await OrderService.changeStatus(
      Number(req.params.id),
      { status, notes },
      req.user.id,
      { userId: req.user.id, userName: req.user.username, role: req.user.role, ip: req.ip }
    )
    ApiResponse.success(res, order, `Estado actualizado a "${status}"`)
  } catch (err) { next(err) }
}

export async function close(req, res, next) {
  try {
    const { payment_method, payment_status, notes } = req.body
    const order = await OrderService.close(
      Number(req.params.id),
      { payment_method, payment_status, notes },
      req.user.id
    )
    ApiResponse.success(res, order, 'Orden cerrada y entregada exitosamente')
  } catch (err) { next(err) }
}

// ── Servicios ─────────────────────────────────────────────────

export async function addService(req, res, next) {
  try {
    const service = await OrderService.addService(Number(req.params.id), req.body)
    ApiResponse.created(res, service, 'Servicio agregado a la orden')
  } catch (err) { next(err) }
}

export async function removeService(req, res, next) {
  try {
    await OrderService.removeService(
      Number(req.params.id),
      Number(req.params.serviceId)
    )
    ApiResponse.noContent(res)
  } catch (err) { next(err) }
}

// ── Repuestos ─────────────────────────────────────────────────

export async function addPart(req, res, next) {
  try {
    const item = await OrderService.addPart(Number(req.params.id), req.body)
    ApiResponse.created(res, item, 'Repuesto agregado a la orden')
  } catch (err) { next(err) }
}

export async function removePart(req, res, next) {
  try {
    await OrderService.removePart(
      Number(req.params.id),
      Number(req.params.itemId)
    )
    ApiResponse.noContent(res)
  } catch (err) { next(err) }
}

// ── Catálogo de servicios ─────────────────────────────────────

export async function getServiceCatalog(req, res, next) {
  try {
    const catalog = await OrderService.getServiceCatalog(req.query)
    ApiResponse.success(res, catalog)
  } catch (err) { next(err) }
}

import { ApiResponse } from '../utils/ApiResponse.js'
import * as TechService from '../services/technician.service.js'

async function getEmployeeId(req) {
  return TechService.resolveEmployeeId(req.user.id)
}

export async function getDashboard(req, res, next) {
  try {
    const empId = await getEmployeeId(req)
    const data = await TechService.getDashboard(empId)
    ApiResponse.success(res, data)
  } catch (err) { next(err) }
}

export async function getOrders(req, res, next) {
  try {
    const empId = await getEmployeeId(req)
    const result = await TechService.getOrders(empId, req.query)
    ApiResponse.paginated(res, result.data, result)
  } catch (err) { next(err) }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const empId = await getEmployeeId(req)
    const order = await TechService.updateOrderStatus(empId, Number(req.params.id), req.body, { userId: req.user.id, ip: req.ip })
    ApiResponse.success(res, order, `Estado actualizado a "${req.body.status}"`)
  } catch (err) { next(err) }
}

export async function updateOrderNotes(req, res, next) {
  try {
    const empId = await getEmployeeId(req)
    const order = await TechService.updateOrderNotes(empId, Number(req.params.id), req.body)
    ApiResponse.success(res, order, 'Notas actualizadas')
  } catch (err) { next(err) }
}

export async function getMotorcycles(req, res, next) {
  try {
    const empId = await getEmployeeId(req)
    const motos = await TechService.getMotorcycles(empId)
    ApiResponse.success(res, motos)
  } catch (err) { next(err) }
}

export async function getPartRequests(req, res, next) {
  try {
    const empId = await getEmployeeId(req)
    const result = await TechService.getPartRequests(empId, req.query)
    ApiResponse.paginated(res, result.data, result)
  } catch (err) { next(err) }
}

export async function createPartRequest(req, res, next) {
  try {
    const empId = await getEmployeeId(req)
    const request = await TechService.createPartRequest(empId, req.body)
    ApiResponse.created(res, request, 'Solicitud de repuesto creada')
  } catch (err) { next(err) }
}

export async function getEarnings(req, res, next) {
  try {
    const empId = await getEmployeeId(req)
    const data = await TechService.getEarnings(empId)
    ApiResponse.success(res, data)
  } catch (err) { next(err) }
}

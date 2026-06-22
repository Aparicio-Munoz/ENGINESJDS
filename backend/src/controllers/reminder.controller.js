import { ApiResponse } from '../utils/ApiResponse.js'
import * as ReminderService from '../services/reminder.service.js'

function actor(req) {
  return { userId: req.user.id, userName: req.user.username, role: req.user.role, ip: req.ip }
}

export async function getAll(req, res, next) {
  try {
    const result = await ReminderService.getAll(req.query)
    ApiResponse.paginated(res, result.data, result)
  } catch (err) { next(err) }
}

export async function getById(req, res, next) {
  try {
    const r = await ReminderService.getById(Number(req.params.id))
    ApiResponse.success(res, r)
  } catch (err) { next(err) }
}

export async function create(req, res, next) {
  try {
    const r = await ReminderService.create(req.body, actor(req))
    ApiResponse.created(res, r, 'Recordatorio creado')
  } catch (err) { next(err) }
}

export async function update(req, res, next) {
  try {
    const r = await ReminderService.update(Number(req.params.id), req.body, actor(req))
    ApiResponse.success(res, r, 'Recordatorio actualizado')
  } catch (err) { next(err) }
}

export async function remove(req, res, next) {
  try {
    await ReminderService.remove(Number(req.params.id), actor(req))
    ApiResponse.noContent(res)
  } catch (err) { next(err) }
}

export async function send(req, res, next) {
  try {
    const result = await ReminderService.send(Number(req.params.id), actor(req))
    ApiResponse.success(res, result, 'Recordatorio enviado')
  } catch (err) { next(err) }
}

export async function getDashboard(req, res, next) {
  try {
    const data = await ReminderService.getCRMDashboard()
    ApiResponse.success(res, data)
  } catch (err) { next(err) }
}

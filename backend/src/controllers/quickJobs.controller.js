import { ApiResponse } from '../utils/ApiResponse.js'
import * as QuickJobsService from '../services/quickJobs.service.js'

export async function getAll(req, res, next) {
  try {
    const { employee_id, from, to, page, limit } = req.query
    const result = await QuickJobsService.getAll({ employeeId: employee_id, from, to, page, limit })
    ApiResponse.paginated(res, result.data, result)
  } catch (err) { next(err) }
}

export async function create(req, res, next) {
  try {
    const actor = { userId: req.user.id, userName: req.user.username, role: req.user.role, ip: req.ip }
    const job = await QuickJobsService.create(req.body, actor)
    ApiResponse.created(res, job, 'Trabajo rápido registrado exitosamente')
  } catch (err) { next(err) }
}

export async function remove(req, res, next) {
  try {
    const actor = { userId: req.user.id, userName: req.user.username, role: req.user.role, ip: req.ip }
    await QuickJobsService.remove(Number(req.params.id), actor)
    ApiResponse.noContent(res)
  } catch (err) { next(err) }
}

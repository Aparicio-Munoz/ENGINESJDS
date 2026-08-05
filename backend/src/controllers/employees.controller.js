import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import * as EmployeeService from '../services/employees.service.js'

export async function getAll(req, res, next) {
  try {
    const { search, status, specialty, sort, page, limit } = req.query
    const result = await EmployeeService.getAll({ search, status, specialty, sort, page, limit })
    ApiResponse.paginated(res, result.data, result)
  } catch (err) {
    next(err)
  }
}

export async function getById(req, res, next) {
  try {
    const employee = await EmployeeService.getById(Number(req.params.id))
    ApiResponse.success(res, employee)
  } catch (err) {
    next(err)
  }
}

export async function create(req, res, next) {
  try {
    const employee = await EmployeeService.create(req.body, { userId: req.user.id, userName: req.user.username, role: req.user.role, ip: req.ip })
    ApiResponse.created(res, employee, 'Empleado registrado exitosamente')
  } catch (err) {
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const employee = await EmployeeService.update(Number(req.params.id), req.body)
    ApiResponse.success(res, employee, 'Empleado actualizado correctamente')
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
    await EmployeeService.remove(Number(req.params.id), req.user.id, reason)
    ApiResponse.noContent(res)
  } catch (err) {
    next(err)
  }
}

export async function getPerformance(req, res, next) {
  try {
    const result = await EmployeeService.getPerformance(Number(req.params.id))
    ApiResponse.success(res, result)
  } catch (err) {
    next(err)
  }
}

export async function getEarnings(req, res, next) {
  try {
    const { from, to } = req.query
    const result = await EmployeeService.getEarningsByRange(Number(req.params.id), { from, to })
    ApiResponse.success(res, result)
  } catch (err) {
    next(err)
  }
}

export async function getSpecialties(req, res, next) {
  try {
    const specialties = await EmployeeService.getSpecialties()
    ApiResponse.success(res, specialties)
  } catch (err) {
    next(err)
  }
}

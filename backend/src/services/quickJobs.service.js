import * as QuickJobModel from '../models/quickJob.model.js'
import * as EmployeeModel from '../models/employee.model.js'
import { ApiError } from '../utils/ApiError.js'
import { auditEntity, AUDIT_ACTIONS } from './audit.service.js'

export async function getAll({ employeeId, from, to, page = 1, limit = 50 } = {}) {
  const { rows, total } = await QuickJobModel.findAll({ employeeId, from, to, page, limit })
  return { data: rows, total: Number(total), page: Number(page), limit: Number(limit) }
}

export async function create({ description, price, employee_id }, actor = {}) {
  const employee = await EmployeeModel.findById(employee_id)
  if (!employee) throw ApiError.notFound('Empleado no encontrado')
  if (employee.status !== 'Activo') {
    throw ApiError.conflict(`${employee.name} ${employee.last_name} no está activo`)
  }

  const created = await QuickJobModel.create({
    description: description.trim(),
    price:       Number(price),
    employee_id: Number(employee_id),
    created_by:  actor.userId ?? null,
  })

  await auditEntity(AUDIT_ACTIONS.CREAR_TRABAJO_RAPIDO, {
    actor, tableName: 'quick_jobs', recordId: created.id, newValues: created,
    description: `Trabajo rápido "${created.description}" (${created.employee_name}) registrado`,
  })
  return created
}

export async function remove(id, actor = {}) {
  const job = await QuickJobModel.findById(id)
  if (!job) throw ApiError.notFound('Trabajo rápido no encontrado')

  await QuickJobModel.softDelete(id)
  await auditEntity(AUDIT_ACTIONS.ELIMINAR_TRABAJO_RAPIDO, {
    actor, tableName: 'quick_jobs', recordId: id, oldValues: job,
    description: `Trabajo rápido "${job.description}" (${job.employee_name}) eliminado`,
  })
}

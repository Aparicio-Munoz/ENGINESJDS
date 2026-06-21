import { getPool } from '../config/database.js'
import * as EmployeeModel from '../models/employee.model.js'
import { ApiError } from '../utils/ApiError.js'
import { auditEntity, AUDIT_ACTIONS } from './audit.service.js'

export async function getAll({ search, status, specialty, sort, page = 1, limit = 20 } = {}) {
  const { rows, total } = await EmployeeModel.findAll({
    search, status, specialty, sort, page, limit,
  })
  return {
    data:  rows,
    total: Number(total),
    page:  Number(page),
    limit: Number(limit),
  }
}

export async function getById(id) {
  const employee = await EmployeeModel.findById(id)
  if (!employee) throw ApiError.notFound('Empleado no encontrado')
  return employee
}

export async function create(data, actor = {}) {
  await _checkUniqueness(data)

  const created = await EmployeeModel.create(data)
  await auditEntity(AUDIT_ACTIONS.CREAR_EMPLEADO, {
    actor, tableName: 'employees', recordId: created.id, newValues: created,
  })
  return created
}

export async function update(id, data) {
  await getById(id)
  await _checkUniqueness(data, id)

  return EmployeeModel.update(id, data)
}

export async function remove(id, deletedById, reason) {
  if (!reason?.trim()) {
    throw ApiError.badRequest('El motivo de eliminación es requerido')
  }

  const employee = await EmployeeModel.findByIdRaw(id)
  if (!employee || employee.deleted_at !== null) {
    throw ApiError.notFound('Empleado no encontrado')
  }

  const activeCount = await EmployeeModel.countActiveOrders(id)
  if (activeCount > 0) {
    throw ApiError.conflict(
      `El empleado tiene ${activeCount} orden(es) de trabajo activa(s). ` +
      `Reasígnalas antes de eliminar el empleado.`
    )
  }

  await getPool().query(
    `INSERT INTO deletion_logs
       (entity_type, entity_id, entity_label, entity_data, reason, deleted_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      'employees',
      id,
      `${employee.name} ${employee.last_name}`,
      JSON.stringify(employee),
      reason.trim(),
      deletedById,
    ]
  )

  await EmployeeModel.softDelete(id)
}

export async function getPerformance(id) {
  const employee = await getById(id)

  const [orderStats, earnings] = await Promise.all([
    EmployeeModel.getOrderStats(id),
    EmployeeModel.getEarnings(id),
  ])

  // Costo salarial estimado por período (daily_rate como base)
  const dailyRate = Number(employee.daily_rate)

  return {
    employee,
    metrics: {
      totalOrders:      Number(orderStats.total_orders),
      completedOrders:  Number(orderStats.completed_orders),
      activeOrders:     Number(orderStats.active_orders),
      totalServices:    Number(earnings.total_services),
      totalRevenue:     Number(earnings.total_revenue),
      // Ingresos generados por servicios
      dailyEarnings:    Number(earnings.daily_earnings),
      biweeklyEarnings: Number(earnings.biweekly_earnings),
      monthlyEarnings:  Number(earnings.monthly_earnings),
      // Costo salarial estimado
      dailySalaryCost:      dailyRate,
      biweeklySalaryCost:   dailyRate * 15,
      monthlySalaryCost:    dailyRate * 26,
    },
  }
}

export async function getSpecialties() {
  return EmployeeModel.findSpecialties()
}

// ── Helpers privados ──────────────────────────────────────────
async function _checkUniqueness({ document, email, phone }, excludeId = null) {
  const checks = []

  if (document !== undefined) {
    checks.push(
      EmployeeModel.documentExists(document, excludeId).then((exists) => {
        if (exists) throw ApiError.conflict(`El documento ${document} ya está registrado`)
      })
    )
  }
  if (email) {
    checks.push(
      EmployeeModel.emailExists(email, excludeId).then((exists) => {
        if (exists) throw ApiError.conflict(`El email ${email} ya está registrado`)
      })
    )
  }
  if (phone !== undefined) {
    checks.push(
      EmployeeModel.phoneExists(phone, excludeId).then((exists) => {
        if (exists) throw ApiError.conflict(`El teléfono ${phone} ya está registrado`)
      })
    )
  }

  await Promise.all(checks)
}

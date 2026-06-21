import { ApiError } from '../utils/ApiError.js'
import * as ReportModel from '../models/report.model.js'
import * as AuditLogModel from '../models/auditLog.model.js'

const VALID_PERIODS = ['daily', 'weekly', 'biweekly', 'monthly']

// ── Auditoría ─────────────────────────────────────────────────
export async function getAuditLogs(query = {}) {
  const { search, date_from, date_to, user_id, action, table_name, page = 1, limit = 20 } = query
  const { rows, total } = await AuditLogModel.findAll({
    search, date_from, date_to, user_id, action, table_name, page, limit,
  })
  return { data: rows, total: Number(total), page: Number(page), limit: Number(limit) }
}

export async function getAuditActions() {
  return AuditLogModel.findDistinctActions()
}

export async function getAuditTables() {
  return AuditLogModel.findDistinctTables()
}

// ── Dashboard KPIs ────────────────────────────────────────────
export async function getSummary() {
  return ReportModel.getSummaryData()
}

// ── Ventas por período ────────────────────────────────────────
export async function getOrdersByPeriod(period = 'monthly') {
  if (period && !VALID_PERIODS.includes(period)) {
    throw ApiError.badRequest(
      `Período inválido — valores válidos: ${VALID_PERIODS.join(', ')}`
    )
  }
  return ReportModel.getOrdersByPeriod(period ?? 'monthly')
}

// ── Top repuestos ─────────────────────────────────────────────
export async function getTopParts({ limit = 10 } = {}) {
  const n = Number(limit)
  if (isNaN(n) || n < 1 || n > 50) {
    throw ApiError.badRequest('limit debe ser un número entre 1 y 50')
  }
  return ReportModel.getTopParts(n)
}

// ── Rendimiento de empleados ──────────────────────────────────
export async function getEmployeeStats() {
  return ReportModel.getEmployeePerformance()
}

// ── Estado tecnomecánica ──────────────────────────────────────
export async function getTecnomecanica() {
  return ReportModel.getTecnomecanicaStatus()
}

// ── Alertas de inventario ─────────────────────────────────────
export async function getInventoryAlerts() {
  return ReportModel.getInventoryAlerts()
}

// ── Chart data ───────────────────────────────────────────────
export async function getChartData() {
  const [monthlyRevenue, topServices, topClients, stockByCategory, ordersByTech, appointmentsByMonth] =
    await Promise.all([
      ReportModel.getMonthlyRevenue(),
      ReportModel.getTopServices(10),
      ReportModel.getTopClients(10),
      ReportModel.getStockByCategory(),
      ReportModel.getOrdersByTechnician(),
      ReportModel.getAppointmentsByMonth(),
    ])

  return { monthlyRevenue, topServices, topClients, stockByCategory, ordersByTech, appointmentsByMonth }
}

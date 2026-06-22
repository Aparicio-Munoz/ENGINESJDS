import { getPool } from '../config/database.js'
import * as EmployeeModel from '../models/employee.model.js'
import { ApiError } from '../utils/ApiError.js'
import { auditEntity, AUDIT_ACTIONS } from './audit.service.js'
import { emit, emitToTracking, EVENTS } from '../socket/index.js'

// ── Resolver employee_id del técnico autenticado ─────────────
export async function resolveEmployeeId(userId) {
  const emp = await EmployeeModel.findByUserId(userId)
  if (!emp) throw ApiError.forbidden('No tienes ficha de empleado asociada a tu cuenta')
  return emp.id
}

// ── Dashboard ────────────────────────────────────────────────
export async function getDashboard(employeeId) {
  const pool = getPool()

  const [
    [statsRows],
    [earningsRows],
    [recentRows],
    [requestRows],
  ] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*)                                                      AS total_orders,
         COUNT(CASE WHEN status NOT IN ('Entregada') THEN 1 END)     AS active_orders,
         COUNT(CASE WHEN status = 'Pendiente' THEN 1 END)            AS pending,
         COUNT(CASE WHEN status IN ('En proceso','En reparación') THEN 1 END) AS in_progress,
         COUNT(CASE WHEN status = 'Esperando repuesto' THEN 1 END)   AS waiting_parts,
         COUNT(CASE WHEN status IN ('Listo','Lista para entrega') THEN 1 END) AS ready,
         COUNT(CASE WHEN status = 'Entregada' THEN 1 END)            AS delivered
       FROM orders WHERE assigned_employee_id = ?`,
      [employeeId]
    ),
    pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN YEAR(o.entry_date) = YEAR(CURDATE())
                            AND MONTH(o.entry_date) = MONTH(CURDATE())
                       THEN os.total_price END), 0) AS monthly_earnings,
         COALESCE(SUM(CASE WHEN DATE(o.entry_date) = CURDATE()
                       THEN os.total_price END), 0) AS daily_earnings,
         COUNT(DISTINCT os.id) AS total_services
       FROM order_services os
       INNER JOIN orders o ON o.id = os.order_id
       WHERE os.employee_id = ?`,
      [employeeId]
    ),
    pool.query(
      `SELECT o.id, o.order_number, o.status, o.entry_date,
              m.plate AS motorcycle_plate, m.brand AS motorcycle_brand, m.model AS motorcycle_model,
              CONCAT(c.name, ' ', c.last_name) AS client_name
       FROM orders o
       INNER JOIN motorcycles m ON m.id = o.motorcycle_id
       INNER JOIN clients c     ON c.id = o.client_id
       WHERE o.assigned_employee_id = ? AND o.status != 'Entregada'
       ORDER BY o.entry_date DESC
       LIMIT 5`,
      [employeeId]
    ),
    pool.query(
      `SELECT COUNT(*) AS pending_requests
       FROM part_requests
       WHERE employee_id = ? AND status = 'Pendiente'`,
      [employeeId]
    ),
  ])

  return {
    stats: statsRows[0],
    earnings: earningsRows[0],
    recentOrders: recentRows,
    pendingRequests: requestRows[0].pending_requests,
  }
}

// ── Órdenes asignadas ────────────────────────────────────────
export async function getOrders(employeeId, query = {}) {
  const pool = getPool()
  const { search, status, sort = 'entry_date', page = 1, limit = 20 } = query

  const conditions = ['o.assigned_employee_id = ?']
  const params = [employeeId]

  if (search) {
    conditions.push(`(o.order_number LIKE ? OR CONCAT(c.name, ' ', c.last_name) LIKE ? OR m.plate LIKE ?)`)
    const t = `%${search}%`
    params.push(t, t, t)
  }
  if (status) {
    conditions.push('o.status = ?')
    params.push(status)
  }

  const where = `WHERE ${conditions.join(' AND ')}`
  const orderBy = sort === 'status' ? 'o.status ASC, o.entry_date DESC' : 'o.entry_date DESC'
  const offset = (Number(page) - 1) * Number(limit)

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM orders o
     INNER JOIN clients c     ON c.id = o.client_id
     INNER JOIN motorcycles m ON m.id = o.motorcycle_id
     ${where}`,
    params
  )

  const [rows] = await pool.query(
    `SELECT
       o.id, o.order_number, o.status, o.entry_date,
       o.estimated_delivery_date, o.actual_delivery_date,
       o.labor_cost, o.parts_cost, o.discount, o.subtotal, o.final_price,
       o.diagnostic_notes, o.work_notes,
       o.motorcycle_id, o.client_id, o.assigned_employee_id,
       o.created_at, o.updated_at,
       CONCAT(c.name, ' ', c.last_name) AS client_name,
       c.phone AS client_phone,
       m.plate AS motorcycle_plate, m.brand AS motorcycle_brand,
       m.model AS motorcycle_model, m.year AS motorcycle_year,
       m.color AS motorcycle_color, m.engine_cc
     FROM orders o
     INNER JOIN clients c     ON c.id = o.client_id
     INNER JOIN motorcycles m ON m.id = o.motorcycle_id
     ${where}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  )

  return { data: rows, total: Number(total), page: Number(page), limit: Number(limit) }
}

// ── Actualizar estado (solo estados de técnico) ──────────────
const TECH_STATUSES = ['Pendiente', 'En reparación', 'Esperando repuesto', 'Lista para entrega']

export async function updateOrderStatus(employeeId, orderId, { status, notes }, actor = {}) {
  const pool = getPool()

  if (!TECH_STATUSES.includes(status)) {
    throw ApiError.badRequest(`Estado inválido para técnico — válidos: ${TECH_STATUSES.join(', ')}`)
  }

  const [[order]] = await pool.query(
    'SELECT id, status, assigned_employee_id FROM orders WHERE id = ?',
    [orderId]
  )
  if (!order) throw ApiError.notFound('Orden no encontrada')
  if (order.assigned_employee_id !== employeeId) {
    throw ApiError.forbidden('Esta orden no está asignada a ti')
  }
  if (order.status === 'Entregada') {
    throw ApiError.conflict('No se puede cambiar el estado de una orden entregada')
  }

  await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId])

  await auditEntity(AUDIT_ACTIONS.CAMBIAR_ESTADO, {
    actor,
    tableName: 'orders',
    recordId: orderId,
    oldValues: { status: order.status },
    newValues: { status, notes: notes ?? null },
  })

  const [rows] = await pool.query(
    `SELECT o.*, CONCAT(c.name, ' ', c.last_name) AS client_name,
            m.plate AS motorcycle_plate, m.brand AS motorcycle_brand, m.model AS motorcycle_model
     FROM orders o
     INNER JOIN clients c     ON c.id = o.client_id
     INNER JOIN motorcycles m ON m.id = o.motorcycle_id
     WHERE o.id = ?`,
    [orderId]
  )

  const updated = rows[0]
  emit(EVENTS.ORDER_STATUS_CHANGED, {
    id: orderId, order_number: updated?.order_number,
    previousStatus: order.status, newStatus: status,
    updatedAt: new Date().toISOString(),
  })
  if (updated?.tracking_token) {
    emitToTracking(updated.tracking_token, EVENTS.TRACKING_UPDATED, {
      tracking_token: updated.tracking_token, status,
    })
  }
  emit(EVENTS.DASHBOARD_REFRESH, { trigger: 'tech_status_changed' })

  return updated
}

// ── Agregar notas técnicas ───────────────────────────────────
export async function updateOrderNotes(employeeId, orderId, { work_notes }) {
  const pool = getPool()

  const [[order]] = await pool.query(
    'SELECT id, assigned_employee_id, status FROM orders WHERE id = ?',
    [orderId]
  )
  if (!order) throw ApiError.notFound('Orden no encontrada')
  if (order.assigned_employee_id !== employeeId) {
    throw ApiError.forbidden('Esta orden no está asignada a ti')
  }
  if (order.status === 'Entregada') {
    throw ApiError.conflict('No se pueden modificar notas de una orden entregada')
  }

  await pool.query('UPDATE orders SET work_notes = ? WHERE id = ?', [work_notes, orderId])

  const [rows] = await pool.query(
    `SELECT o.*, CONCAT(c.name, ' ', c.last_name) AS client_name,
            m.plate AS motorcycle_plate, m.brand AS motorcycle_brand, m.model AS motorcycle_model
     FROM orders o
     INNER JOIN clients c     ON c.id = o.client_id
     INNER JOIN motorcycles m ON m.id = o.motorcycle_id
     WHERE o.id = ?`,
    [orderId]
  )
  return rows[0]
}

// ── Motocicletas asignadas (de órdenes activas) ──────────────
export async function getMotorcycles(employeeId) {
  const pool = getPool()
  const [rows] = await pool.query(
    `SELECT DISTINCT
       m.id, m.plate, m.brand, m.model, m.year, m.color, m.engine_cc, m.vin,
       CONCAT(c.name, ' ', c.last_name) AS client_name, c.phone AS client_phone,
       o.id AS order_id, o.order_number, o.status AS order_status,
       o.diagnostic_notes, o.entry_date
     FROM orders o
     INNER JOIN motorcycles m ON m.id = o.motorcycle_id
     INNER JOIN clients c     ON c.id = o.client_id
     WHERE o.assigned_employee_id = ? AND o.status != 'Entregada'
     ORDER BY o.entry_date DESC`,
    [employeeId]
  )
  return rows
}

// ── Solicitudes de repuestos ─────────────────────────────────
export async function getPartRequests(employeeId, query = {}) {
  const pool = getPool()
  const { status, page = 1, limit = 20 } = query

  const conditions = ['pr.employee_id = ?']
  const params = [employeeId]

  if (status) {
    conditions.push('pr.status = ?')
    params.push(status)
  }

  const where = `WHERE ${conditions.join(' AND ')}`
  const offset = (Number(page) - 1) * Number(limit)

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM part_requests pr ${where}`,
    params
  )

  const [rows] = await pool.query(
    `SELECT pr.*,
            o.order_number,
            m.plate AS motorcycle_plate, m.brand AS motorcycle_brand
     FROM part_requests pr
     INNER JOIN orders o      ON o.id = pr.order_id
     INNER JOIN motorcycles m ON m.id = o.motorcycle_id
     ${where}
     ORDER BY pr.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  )

  return { data: rows, total: Number(total), page: Number(page), limit: Number(limit) }
}

export async function createPartRequest(employeeId, data) {
  const pool = getPool()
  const { order_id, part_name, quantity = 1, urgency = 'Normal', notes } = data

  const [[order]] = await pool.query(
    'SELECT id, assigned_employee_id, status FROM orders WHERE id = ?',
    [order_id]
  )
  if (!order) throw ApiError.notFound('Orden no encontrada')
  if (order.assigned_employee_id !== employeeId) {
    throw ApiError.forbidden('Esta orden no está asignada a ti')
  }
  if (order.status === 'Entregada') {
    throw ApiError.conflict('No se puede solicitar repuestos para una orden entregada')
  }

  const [result] = await pool.query(
    `INSERT INTO part_requests (order_id, employee_id, part_name, quantity, urgency, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [order_id, employeeId, part_name.trim(), quantity, urgency, notes?.trim() || null]
  )

  const [rows] = await pool.query(
    `SELECT pr.*, o.order_number
     FROM part_requests pr
     INNER JOIN orders o ON o.id = pr.order_id
     WHERE pr.id = ?`,
    [result.insertId]
  )
  return rows[0]
}

// ── Ganancias ────────────────────────────────────────────────
export async function getEarnings(employeeId) {
  const pool = getPool()

  const [summaryRows] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN DATE(o.entry_date) = CURDATE()
                     THEN os.total_price END), 0)                     AS daily_earnings,
       COALESCE(SUM(CASE WHEN o.entry_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
                     THEN os.total_price END), 0)                     AS biweekly_earnings,
       COALESCE(SUM(CASE WHEN YEAR(o.entry_date) = YEAR(CURDATE())
                         AND MONTH(o.entry_date) = MONTH(CURDATE())
                     THEN os.total_price END), 0)                     AS monthly_earnings,
       COALESCE(SUM(os.total_price), 0)                               AS total_revenue,
       COUNT(DISTINCT os.id)                                          AS total_services,
       COUNT(DISTINCT CASE WHEN o.status = 'Entregada' THEN o.id END) AS completed_orders
     FROM order_services os
     INNER JOIN orders o ON o.id = os.order_id
     WHERE os.employee_id = ?`,
    [employeeId]
  )

  const [monthlyRows] = await pool.query(
    `SELECT
       DATE_FORMAT(o.entry_date, '%Y-%m') AS month,
       DATE_FORMAT(o.entry_date, '%M %Y') AS month_label,
       COALESCE(SUM(os.total_price), 0)   AS earnings,
       COUNT(DISTINCT os.id)              AS services,
       COUNT(DISTINCT o.id)               AS orders
     FROM order_services os
     INNER JOIN orders o ON o.id = os.order_id
     WHERE os.employee_id = ?
       AND o.entry_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
     GROUP BY DATE_FORMAT(o.entry_date, '%Y-%m'), DATE_FORMAT(o.entry_date, '%M %Y')
     ORDER BY month DESC`,
    [employeeId]
  )

  const [historyRows] = await pool.query(
    `SELECT
       o.id, o.order_number, o.status, o.entry_date, o.actual_delivery_date,
       o.final_price,
       m.plate AS motorcycle_plate, m.brand AS motorcycle_brand, m.model AS motorcycle_model,
       CONCAT(c.name, ' ', c.last_name) AS client_name,
       (SELECT COALESCE(SUM(os2.total_price), 0)
        FROM order_services os2
        WHERE os2.order_id = o.id AND os2.employee_id = ?) AS my_earnings
     FROM orders o
     INNER JOIN motorcycles m ON m.id = o.motorcycle_id
     INNER JOIN clients c     ON c.id = o.client_id
     WHERE o.assigned_employee_id = ? AND o.status = 'Entregada'
     ORDER BY o.actual_delivery_date DESC
     LIMIT 20`,
    [employeeId, employeeId]
  )

  return {
    summary: summaryRows[0],
    monthly: monthlyRows,
    history: historyRows,
  }
}

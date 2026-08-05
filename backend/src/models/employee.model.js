import { getPool } from '../config/database.js'

const SAFE_FIELDS = `
  id, user_id, document_type, document, name, last_name,
  specialty, phone, email, daily_rate, commission_percent, status, hire_date,
  notes, created_at, updated_at
`

const SORT_MAP = {
  name:       'name ASC, last_name ASC',
  created_at: 'created_at DESC',
  hire_date:  'hire_date DESC',
}

// ── Listado paginado con filtros ─────────────────────────────
export async function findAll({
  search,
  status,
  specialty,
  sort  = 'created_at',
  page  = 1,
  limit = 20,
} = {}) {
  const conditions = ['deleted_at IS NULL']
  const params     = []

  if (search) {
    conditions.push(
      '(name LIKE ? OR last_name LIKE ? OR document LIKE ? OR specialty LIKE ? OR phone LIKE ? OR email LIKE ?)'
    )
    const t = `%${search}%`
    params.push(t, t, t, t, t, t)
  }
  if (status)    { conditions.push('status = ?');    params.push(status) }
  if (specialty) { conditions.push('specialty = ?'); params.push(specialty) }

  const where   = `WHERE ${conditions.join(' AND ')}`
  const orderBy = SORT_MAP[sort] ?? SORT_MAP.created_at
  const offset  = (Number(page) - 1) * Number(limit)

  const [[{ total }]] = await getPool().query(
    `SELECT COUNT(*) AS total FROM employees ${where}`,
    params
  )
  const [rows] = await getPool().query(
    `SELECT ${SAFE_FIELDS} FROM employees ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  )

  return { rows, total: Number(total) }
}

export async function findById(id) {
  const [rows] = await getPool().query(
    `SELECT ${SAFE_FIELDS} FROM employees WHERE id = ? AND deleted_at IS NULL`,
    [id]
  )
  return rows[0] ?? null
}

// Incluye todos los campos — para snapshot en deletion_logs
export async function findByIdRaw(id) {
  const [rows] = await getPool().query('SELECT * FROM employees WHERE id = ?', [id])
  return rows[0] ?? null
}

export async function findByUserId(userId) {
  const [rows] = await getPool().query(
    'SELECT id FROM employees WHERE user_id = ? AND deleted_at IS NULL',
    [userId]
  )
  return rows[0] ?? null
}

// ── Unicidad ─────────────────────────────────────────────────
export async function documentExists(document, excludeId = null) {
  const [rows] = await getPool().query(
    'SELECT id FROM employees WHERE document = ? AND id != ? AND deleted_at IS NULL',
    [document, excludeId ?? 0]
  )
  return rows.length > 0
}

export async function emailExists(email, excludeId = null) {
  if (!email) return false
  const [rows] = await getPool().query(
    'SELECT id FROM employees WHERE email = ? AND id != ? AND deleted_at IS NULL',
    [email, excludeId ?? 0]
  )
  return rows.length > 0
}

export async function phoneExists(phone, excludeId = null) {
  const [rows] = await getPool().query(
    'SELECT id FROM employees WHERE phone = ? AND id != ? AND deleted_at IS NULL',
    [phone, excludeId ?? 0]
  )
  return rows.length > 0
}

// ── CRUD ─────────────────────────────────────────────────────
export async function create({
  user_id       = null,
  document_type = 'CC',
  document,
  name,
  last_name,
  specialty,
  phone,
  email      = null,
  daily_rate = 0,
  commission_percent = 0,
  status     = 'Activo',
  hire_date,
  notes      = null,
}) {
  const [result] = await getPool().query(
    `INSERT INTO employees
       (user_id, document_type, document, name, last_name,
        specialty, phone, email, daily_rate, commission_percent, status, hire_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [user_id, document_type, document, name, last_name,
     specialty, phone, email, daily_rate, commission_percent, status, hire_date, notes]
  )
  return findById(result.insertId)
}

export async function update(id, fields) {
  const allowed = [
    'user_id', 'document_type', 'document', 'name', 'last_name',
    'specialty', 'phone', 'email', 'daily_rate', 'commission_percent', 'status', 'hire_date', 'notes',
  ]
  const sets   = []
  const params = []

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`)
      params.push(fields[key])
    }
  }
  if (!sets.length) return findById(id)

  params.push(id)
  await getPool().query(
    `UPDATE employees SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
    params
  )
  return findById(id)
}

export async function softDelete(id) {
  const [result] = await getPool().query(
    'UPDATE employees SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
    [id]
  )
  return result.affectedRows > 0
}

// ── Validación de negocio ─────────────────────────────────────
export async function countActiveOrders(employeeId) {
  const [rows] = await getPool().query(
    `SELECT COUNT(*) AS cnt FROM orders
     WHERE assigned_employee_id = ? AND status NOT IN ('Entregada')`,
    [employeeId]
  )
  return rows[0].cnt
}

// ── Métricas de rendimiento ───────────────────────────────────
export async function getOrderStats(employeeId) {
  const [rows] = await getPool().query(
    `SELECT
       COUNT(*)                                              AS total_orders,
       COUNT(CASE WHEN status = 'Entregada' THEN 1 END)    AS completed_orders,
       COUNT(CASE WHEN status != 'Entregada' THEN 1 END)   AS active_orders
     FROM orders
     WHERE assigned_employee_id = ?`,
    [employeeId]
  )
  return rows[0]
}

export async function getEarnings(employeeId) {
  // Ingresos generados vía servicios que realizó el empleado
  const [rows] = await getPool().query(
    `SELECT
       -- Hoy
       COALESCE(SUM(
         CASE WHEN DATE(o.entry_date) = CURDATE()
         THEN os.total_price END), 0)                        AS daily_earnings,

       -- Últimos 15 días (quincena)
       COALESCE(SUM(
         CASE WHEN o.entry_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
         THEN os.total_price END), 0)                        AS biweekly_earnings,

       -- Mes en curso
       COALESCE(SUM(
         CASE WHEN YEAR(o.entry_date)  = YEAR(CURDATE())
              AND  MONTH(o.entry_date) = MONTH(CURDATE())
         THEN os.total_price END), 0)                        AS monthly_earnings,

       -- Acumulado histórico
       COALESCE(SUM(os.total_price), 0)                      AS total_revenue,
       COUNT(os.id)                                          AS total_services
     FROM order_services os
     INNER JOIN orders o ON o.id = os.order_id
     WHERE os.employee_id = ?`,
    [employeeId]
  )
  return rows[0]
}

// Total generado (mano de obra + repuestos − descuento) por el empleado
// (técnico asignado) en un rango de fechas — base para el cálculo de comisión
export async function getOrderEarnings(employeeId, from, to) {
  const [[totals]] = await getPool().query(
    `SELECT
       COALESCE(SUM(final_price), 0) AS order_total,
       COUNT(*)                      AS orders_count
     FROM orders
     WHERE assigned_employee_id = ?
       AND DATE(entry_date) BETWEEN ? AND ?`,
    [employeeId, from, to]
  )

  const [orders] = await getPool().query(
    `SELECT
       o.id, o.order_number, o.status, o.entry_date,
       o.labor_cost, o.parts_cost, o.discount, o.final_price,
       m.plate AS motorcycle_plate, m.brand AS motorcycle_brand
     FROM orders o
     INNER JOIN motorcycles m ON m.id = o.motorcycle_id
     WHERE o.assigned_employee_id = ?
       AND DATE(o.entry_date) BETWEEN ? AND ?
     ORDER BY o.entry_date DESC`,
    [employeeId, from, to]
  )

  return {
    order_total:  Number(totals.order_total),
    orders_count: Number(totals.orders_count),
    orders,
  }
}

// Lista de especialidades activas — para filtro en el frontend
export async function findSpecialties() {
  const [rows] = await getPool().query(
    `SELECT DISTINCT specialty FROM employees
     WHERE deleted_at IS NULL
     ORDER BY specialty ASC`
  )
  return rows.map((r) => r.specialty)
}

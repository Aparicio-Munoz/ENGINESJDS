import { getPool } from '../config/database.js'

// subtotal y final_price son GENERATED ALWAYS AS — nunca en INSERT/UPDATE
// parts_cost gestionado por trigger trg_order_items_after_insert/delete — nunca en INSERT/UPDATE
// order_number generado por trigger trg_orders_before_insert — nunca en INSERT
// trg_orders_after_insert  → crea order_status_history automáticamente al crear
// trg_orders_after_update  → crea order_status_history al cambiar status, crea sales si → Entregada
// trg_order_items_after_insert → descuenta stock, actualiza parts_cost, registra movimiento
// trg_order_items_after_delete → devuelve stock, actualiza parts_cost, registra movimiento

const LIST_SELECT = `
  SELECT
    o.id, o.order_number, o.tracking_token, o.status, o.entry_date,
    o.estimated_delivery_date, o.actual_delivery_date,
    o.labor_cost, o.parts_cost, o.discount, o.subtotal, o.final_price,
    o.diagnostic_notes, o.work_notes,
    o.motorcycle_id, o.client_id, o.appointment_id, o.assigned_employee_id,
    o.created_by, o.created_at, o.updated_at,
    CONCAT(c.name, ' ', c.last_name) AS client_name,
    c.phone AS client_phone,
    m.plate AS motorcycle_plate,
    m.brand AS motorcycle_brand,
    m.model AS motorcycle_model,
    CONCAT(e.name, ' ', e.last_name) AS employee_name,
    e.specialty AS employee_specialty
  FROM orders o
  INNER JOIN clients c    ON c.id = o.client_id
  INNER JOIN motorcycles m ON m.id = o.motorcycle_id
  LEFT JOIN employees e   ON e.id = o.assigned_employee_id AND e.deleted_at IS NULL
`

const SORT_MAP = {
  entry_date:     'o.entry_date DESC',
  entry_date_asc: 'o.entry_date ASC',
  status:         'o.status ASC, o.entry_date DESC',
  final_price:    'o.final_price DESC',
  created_at:     'o.created_at DESC',
}

// ── Listado paginado ──────────────────────────────────────────
export async function findAll({
  search,
  status,
  employee_id,
  client_id,
  motorcycle_id,
  date_from,
  date_to,
  sort  = 'entry_date',
  page  = 1,
  limit = 20,
} = {}) {
  const conditions = []
  const params     = []

  if (search) {
    conditions.push(
      `(o.order_number LIKE ? OR CONCAT(c.name, ' ', c.last_name) LIKE ? OR m.plate LIKE ?)`
    )
    const t = `%${search}%`
    params.push(t, t, t)
  }
  if (status)        { conditions.push('o.status = ?');                params.push(status) }
  if (employee_id)   { conditions.push('o.assigned_employee_id = ?'); params.push(Number(employee_id)) }
  if (client_id)     { conditions.push('o.client_id = ?');            params.push(Number(client_id)) }
  if (motorcycle_id) { conditions.push('o.motorcycle_id = ?');        params.push(Number(motorcycle_id)) }
  if (date_from)     { conditions.push('DATE(o.entry_date) >= ?');    params.push(date_from) }
  if (date_to)       { conditions.push('DATE(o.entry_date) <= ?');    params.push(date_to) }

  const where   = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const orderBy = SORT_MAP[sort] ?? SORT_MAP.entry_date
  const offset  = (Number(page) - 1) * Number(limit)

  // El COUNT necesita los mismos JOINs porque search filtra sobre clientes y motos
  const [[{ total }]] = await getPool().query(
    `SELECT COUNT(*) AS total
     FROM orders o
     INNER JOIN clients c    ON c.id = o.client_id
     INNER JOIN motorcycles m ON m.id = o.motorcycle_id
     LEFT JOIN employees e   ON e.id = o.assigned_employee_id AND e.deleted_at IS NULL
     ${where}`,
    params
  )
  const [rows] = await getPool().query(
    `${LIST_SELECT} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  )

  return { rows, total: Number(total) }
}

// ── Órdenes activas (no Entregadas) ──────────────────────────
export async function findActive() {
  const [rows] = await getPool().query(
    `${LIST_SELECT} WHERE o.status != 'Entregada' ORDER BY o.entry_date DESC`
  )
  return rows
}

// ── Detalle con datos completos ───────────────────────────────
export async function findById(id) {
  const [rows] = await getPool().query(
    `SELECT
       o.*,
       c.document_type, c.document,
       c.name AS client_name, c.last_name AS client_last_name,
       c.phone AS client_phone, c.email AS client_email,
       m.plate AS motorcycle_plate, m.brand AS motorcycle_brand,
       m.model AS motorcycle_model, m.year AS motorcycle_year,
       m.color AS motorcycle_color, m.engine_cc, m.vin,
       CONCAT(e.name, ' ', e.last_name) AS employee_name,
       e.specialty AS employee_specialty, e.phone AS employee_phone
     FROM orders o
     INNER JOIN clients c    ON c.id = o.client_id
     INNER JOIN motorcycles m ON m.id = o.motorcycle_id
     LEFT JOIN employees e   ON e.id = o.assigned_employee_id AND e.deleted_at IS NULL
     WHERE o.id = ?`,
    [id]
  )
  return rows[0] ?? null
}

// Para snapshot completo en deletion_logs
export async function findByIdRaw(id) {
  const [rows] = await getPool().query('SELECT * FROM orders WHERE id = ?', [id])
  return rows[0] ?? null
}

// ── Historial completo de la orden ───────────────────────────
export async function findHistory(id) {
  const [
    [orderRows],
    [statusHistory],
    [services],
    [items],
    [saleRows],
  ] = await Promise.all([
    getPool().query(
      `SELECT o.*,
         c.name AS client_name, c.last_name AS client_last_name,
         c.phone AS client_phone, c.email AS client_email, c.document,
         m.plate, m.brand, m.model, m.year, m.color, m.engine_cc, m.vin,
         CONCAT(e.name, ' ', e.last_name) AS employee_name,
         e.specialty AS employee_specialty
       FROM orders o
       INNER JOIN clients c    ON c.id = o.client_id
       INNER JOIN motorcycles m ON m.id = o.motorcycle_id
       LEFT JOIN employees e   ON e.id = o.assigned_employee_id AND e.deleted_at IS NULL
       WHERE o.id = ?`,
      [id]
    ),
    getPool().query(
      `SELECT h.id, h.previous_status, h.new_status, h.notes, h.created_at,
              u.username AS changed_by_name
       FROM order_status_history h
       LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.order_id = ?
       ORDER BY h.created_at ASC`,
      [id]
    ),
    getPool().query(
      `SELECT
         os.id, os.service_catalog_id, os.employee_id, os.service_name,
         os.description, os.quantity, os.unit_price, os.total_price,
         os.status, os.notes, os.created_at,
         CONCAT(e.name, ' ', e.last_name) AS employee_name
       FROM order_services os
       LEFT JOIN employees e ON e.id = os.employee_id AND e.deleted_at IS NULL
       WHERE os.order_id = ?
       ORDER BY os.created_at ASC`,
      [id]
    ),
    getPool().query(
      `SELECT oi.id, oi.inventory_id, oi.part_name, oi.quantity,
              oi.unit_price, oi.total_price, oi.created_at,
              i.code AS part_code, i.brand AS part_brand
       FROM order_items oi
       LEFT JOIN inventory i ON i.id = oi.inventory_id
       WHERE oi.order_id = ?
       ORDER BY oi.created_at ASC`,
      [id]
    ),
    getPool().query('SELECT * FROM sales WHERE order_id = ?', [id]),
  ])

  if (!orderRows[0]) return null

  return {
    order:          orderRows[0],
    status_history: statusHistory,
    services,
    parts:          items,
    sale:           saleRows[0] ?? null,
  }
}

// ── Creación ──────────────────────────────────────────────────
export async function create({
  motorcycle_id,
  client_id,
  appointment_id          = null,
  assigned_employee_id    = null,
  diagnostic_notes        = null,
  estimated_delivery_date = null,
  labor_cost              = 0,
  discount                = 0,
  created_by              = null,
}) {
  const [result] = await getPool().query(
    `INSERT INTO orders
       (motorcycle_id, client_id, appointment_id, assigned_employee_id,
        diagnostic_notes, estimated_delivery_date, labor_cost, discount, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      motorcycle_id, client_id, appointment_id, assigned_employee_id,
      diagnostic_notes, estimated_delivery_date,
      labor_cost, discount, created_by,
    ]
  )
  return findById(result.insertId)
}

// ── Actualización de campos editables ─────────────────────────
export async function update(id, fields) {
  const allowed = [
    'assigned_employee_id',
    'estimated_delivery_date',
    'diagnostic_notes',
    'work_notes',
    'labor_cost',
    'discount',
  ]
  const sets   = []
  const params = []

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      sets.push(`${key} = ?`)
      params.push(fields[key] ?? null)
    }
  }
  if (!sets.length) return findById(id)

  params.push(id)
  await getPool().query(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`, params)
  return findById(id)
}

// ── Cambio de estado ─────────────────────────────────────────
// trg_orders_after_update registra historial y crea sales si → Entregada
export async function updateStatus(id, { status, actual_delivery_date = null }) {
  const sets   = ['status = ?']
  const params = [status]

  if (actual_delivery_date !== null) {
    sets.push('actual_delivery_date = ?')
    params.push(actual_delivery_date)
  }

  params.push(id)
  await getPool().query(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`, params)
  return findById(id)
}

// ── Actualizar datos del registro de venta (post-cierre) ─────
export async function updateSalePayment(orderId, { payment_method, payment_status, notes } = {}) {
  const sets   = []
  const params = []

  if (payment_method) { sets.push('payment_method = ?'); params.push(payment_method) }
  if (payment_status) { sets.push('payment_status = ?'); params.push(payment_status) }
  if (notes)          { sets.push('notes = ?');          params.push(notes) }
  if (!sets.length) return

  params.push(orderId)
  await getPool().query(`UPDATE sales SET ${sets.join(', ')} WHERE order_id = ?`, params)
}

// ── Agregar servicio ──────────────────────────────────────────
export async function addService(orderId, {
  service_catalog_id = null,
  service_name,
  description        = null,
  quantity           = 1,
  unit_price,
  employee_id        = null,
  notes              = null,
}) {
  // total_price es GENERATED (quantity * unit_price) — no se incluye en INSERT
  const [result] = await getPool().query(
    `INSERT INTO order_services
       (order_id, service_catalog_id, employee_id, service_name,
        description, quantity, unit_price, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [orderId, service_catalog_id, employee_id, service_name,
     description, quantity, unit_price, notes]
  )
  const [rows] = await getPool().query(
    `SELECT os.*,
            CONCAT(e.name, ' ', e.last_name) AS employee_name
     FROM order_services os
     LEFT JOIN employees e ON e.id = os.employee_id AND e.deleted_at IS NULL
     WHERE os.id = ?`,
    [result.insertId]
  )
  return rows[0]
}

// ── Eliminar servicio ─────────────────────────────────────────
export async function removeService(orderId, serviceId) {
  const [rows] = await getPool().query(
    'SELECT id FROM order_services WHERE id = ? AND order_id = ?',
    [serviceId, orderId]
  )
  if (!rows.length) return false
  await getPool().query('DELETE FROM order_services WHERE id = ?', [serviceId])
  return true
}

// ── Agregar repuesto ──────────────────────────────────────────
// trg_order_items_after_insert descuenta stock, actualiza parts_cost y registra movimiento
export async function addPart(orderId, { inventory_id, quantity }) {
  const [[inv]] = await getPool().query(
    'SELECT id, name, sale_price, quantity AS stock FROM inventory WHERE id = ?',
    [inventory_id]
  )
  if (!inv) return { error: 'not_found' }
  if (inv.stock < quantity) return { error: 'insufficient_stock', available: inv.stock }

  const [result] = await getPool().query(
    `INSERT INTO order_items (order_id, inventory_id, part_name, quantity, unit_price)
     VALUES (?, ?, ?, ?, ?)`,
    [orderId, inventory_id, inv.name, quantity, inv.sale_price]
  )
  const [rows] = await getPool().query(
    `SELECT oi.*, i.code AS part_code, i.brand AS part_brand
     FROM order_items oi
     LEFT JOIN inventory i ON i.id = oi.inventory_id
     WHERE oi.id = ?`,
    [result.insertId]
  )
  return { item: rows[0] }
}

// ── Eliminar repuesto ─────────────────────────────────────────
// trg_order_items_after_delete devuelve stock, actualiza parts_cost y registra movimiento
export async function removePart(orderId, itemId) {
  const [rows] = await getPool().query(
    'SELECT id FROM order_items WHERE id = ? AND order_id = ?',
    [itemId, orderId]
  )
  if (!rows.length) return false
  await getPool().query('DELETE FROM order_items WHERE id = ?', [itemId])
  return true
}

// ── Contadores para validaciones en módulos relacionados ─────
export async function countActiveByClient(clientId) {
  const [[{ cnt }]] = await getPool().query(
    `SELECT COUNT(*) AS cnt FROM orders WHERE client_id = ? AND status != 'Entregada'`,
    [clientId]
  )
  return cnt
}

export async function countActiveByMotorcycle(motorcycleId) {
  const [[{ cnt }]] = await getPool().query(
    `SELECT COUNT(*) AS cnt FROM orders WHERE motorcycle_id = ? AND status != 'Entregada'`,
    [motorcycleId]
  )
  return cnt
}

export async function countActiveByEmployee(employeeId) {
  const [[{ cnt }]] = await getPool().query(
    `SELECT COUNT(*) AS cnt FROM orders WHERE assigned_employee_id = ? AND status != 'Entregada'`,
    [employeeId]
  )
  return cnt
}

// ── KPIs para dashboard y reportes ───────────────────────────
export async function countByStatus() {
  const [rows] = await getPool().query(
    'SELECT status, COUNT(*) AS total FROM orders GROUP BY status'
  )
  return rows
}

export async function revenueByPeriod(period = 'month') {
  const periodMap = {
    today: `DATE(entry_date) = CURDATE()`,
    week:  `entry_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
    month: `YEAR(entry_date) = YEAR(NOW()) AND MONTH(entry_date) = MONTH(NOW())`,
  }
  const condition = periodMap[period] ?? periodMap.month
  const [[row]] = await getPool().query(
    `SELECT COALESCE(SUM(final_price), 0) AS revenue, COUNT(*) AS count
     FROM orders WHERE status = 'Entregada' AND ${condition}`
  )
  return row
}

// ── Catálogo de servicios disponibles ────────────────────────
export async function findServiceCatalog({ search, category } = {}) {
  const conditions = ['is_active = 1']
  const params     = []

  if (search) {
    conditions.push('(name LIKE ? OR description LIKE ?)')
    const t = `%${search}%`
    params.push(t, t)
  }
  if (category) { conditions.push('category = ?'); params.push(category) }

  const [rows] = await getPool().query(
    `SELECT id, name, description, category, base_price, estimated_minutes
     FROM service_catalog
     WHERE ${conditions.join(' AND ')}
     ORDER BY category ASC, name ASC`,
    params
  )
  return rows
}

// ── Eliminación (hard delete) ─────────────────────────────────
export async function remove(id) {
  await getPool().query('DELETE FROM orders WHERE id = ?', [id])
}

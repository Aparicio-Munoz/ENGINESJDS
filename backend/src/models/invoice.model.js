import { getPool } from '../config/database.js'

async function generateNumber() {
  const pool = getPool()
  const today = new Date()
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const prefix = `FAC-${dateStr}-`
  const [[row]] = await pool.query(
    `SELECT MAX(CAST(SUBSTRING_INDEX(invoice_number, '-', -1) AS UNSIGNED)) AS seq
     FROM invoices WHERE invoice_number LIKE ?`,
    [`${prefix}%`]
  )
  const seq = (Number(row?.seq) || 0) + 1
  return `${prefix}${String(seq).padStart(3, '0')}`
}

export async function findAll({
  search, status, payment_method, date_from, date_to,
  page = 1, limit = 20,
} = {}) {
  const conditions = []
  const params = []

  if (search) {
    conditions.push('(i.invoice_number LIKE ? OR i.client_name LIKE ? OR o.order_number LIKE ?)')
    const t = `%${search}%`
    params.push(t, t, t)
  }
  if (status)         { conditions.push('i.status = ?');         params.push(status) }
  if (payment_method) { conditions.push('i.payment_method = ?'); params.push(payment_method) }
  if (date_from) { conditions.push('i.created_at >= ?'); params.push(`${date_from} 00:00:00`) }
  if (date_to)   { conditions.push('i.created_at <= ?'); params.push(`${date_to} 23:59:59`) }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (Number(page) - 1) * Number(limit)

  const [[{ total }]] = await getPool().query(
    `SELECT COUNT(*) AS total FROM invoices i
     INNER JOIN orders o ON o.id = i.order_id ${where}`, params
  )
  const [rows] = await getPool().query(
    `SELECT i.*, o.order_number, o.tracking_token,
            CONCAT(c.name, ' ', c.last_name) AS order_client_name,
            c.phone AS client_phone,
            m.plate AS motorcycle_plate, m.brand AS motorcycle_brand
     FROM invoices i
     INNER JOIN orders o ON o.id = i.order_id
     INNER JOIN clients c ON c.id = o.client_id
     INNER JOIN motorcycles m ON m.id = o.motorcycle_id
     ${where}
     ORDER BY i.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  )
  return { rows, total: Number(total) }
}

export async function findById(id) {
  const [rows] = await getPool().query(
    `SELECT i.*, o.order_number, o.tracking_token,
            o.diagnostic_notes, o.work_notes,
            o.labor_cost, o.parts_cost,
            c.name AS c_name, c.last_name AS c_last_name,
            c.document_type, c.document AS c_document, c.phone AS c_phone,
            m.plate, m.brand, m.model, m.year, m.engine_cc,
            CONCAT(e.name, ' ', e.last_name) AS employee_name
     FROM invoices i
     INNER JOIN orders o ON o.id = i.order_id
     INNER JOIN clients c ON c.id = o.client_id
     INNER JOIN motorcycles m ON m.id = o.motorcycle_id
     LEFT JOIN employees e ON e.id = o.assigned_employee_id AND e.deleted_at IS NULL
     WHERE i.id = ?`, [id]
  )
  return rows[0] ?? null
}

export async function create({ order_id, subtotal, discount, tax, total, payment_method, notes, created_by, client_name, client_document }) {
  const invoice_number = await generateNumber()
  const [result] = await getPool().query(
    `INSERT INTO invoices (invoice_number, order_id, client_name, client_document, subtotal, discount, tax, total, payment_method, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [invoice_number, order_id, client_name, client_document ?? null, subtotal, discount, tax, total, payment_method, notes ?? null, created_by ?? null]
  )
  return findById(result.insertId)
}

export async function markPaid(id) {
  await getPool().query(
    "UPDATE invoices SET status = 'Pagada', paid_at = NOW() WHERE id = ?", [id]
  )
  return findById(id)
}

export async function markCancelled(id) {
  await getPool().query(
    "UPDATE invoices SET status = 'Anulada' WHERE id = ?", [id]
  )
  return findById(id)
}

export async function getDailySummary(date = null) {
  const targetDate = date ?? new Date().toISOString().slice(0, 10)
  const pool = getPool()

  const [[totals]] = await pool.query(
    `SELECT
       COUNT(*) AS total_invoices,
       COALESCE(SUM(CASE WHEN status = 'Pagada' THEN total ELSE 0 END), 0) AS total_paid,
       COALESCE(SUM(CASE WHEN status = 'Pendiente' THEN total ELSE 0 END), 0) AS total_pending,
       COALESCE(SUM(CASE WHEN status = 'Pagada' AND payment_method = 'Efectivo' THEN total ELSE 0 END), 0) AS efectivo,
       COALESCE(SUM(CASE WHEN status = 'Pagada' AND payment_method = 'Transferencia' THEN total ELSE 0 END), 0) AS transferencia,
       COALESCE(SUM(CASE WHEN status = 'Pagada' AND payment_method = 'Nequi' THEN total ELSE 0 END), 0) AS nequi,
       COALESCE(SUM(CASE WHEN status = 'Pagada' AND payment_method = 'Daviplata' THEN total ELSE 0 END), 0) AS daviplata,
       COALESCE(SUM(CASE WHEN status = 'Pagada' AND payment_method = 'Tarjeta' THEN total ELSE 0 END), 0) AS tarjeta
     FROM invoices
     WHERE DATE(created_at) = ?`,
    [targetDate]
  )

  return {
    date: targetDate,
    totalInvoices: Number(totals.total_invoices),
    totalPaid: Number(totals.total_paid),
    totalPending: Number(totals.total_pending),
    byMethod: {
      Efectivo:       Number(totals.efectivo),
      Transferencia:  Number(totals.transferencia),
      Nequi:          Number(totals.nequi),
      Daviplata:      Number(totals.daviplata),
      Tarjeta:        Number(totals.tarjeta),
    },
  }
}

export async function existsForOrder(orderId) {
  const [rows] = await getPool().query(
    "SELECT id FROM invoices WHERE order_id = ? AND status != 'Anulada' LIMIT 1", [orderId]
  )
  return rows.length > 0
}

export async function getServices(orderId) {
  const [rows] = await getPool().query(
    `SELECT service_name, quantity, unit_price, total_price FROM order_services WHERE order_id = ? ORDER BY created_at ASC`, [orderId]
  )
  return rows
}

export async function getParts(orderId) {
  const [rows] = await getPool().query(
    `SELECT part_name, quantity, unit_price, total_price FROM order_items WHERE order_id = ? ORDER BY created_at ASC`, [orderId]
  )
  return rows
}

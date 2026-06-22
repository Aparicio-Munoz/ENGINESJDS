import { getPool } from '../config/database.js'

export const TYPES = ['MANTENIMIENTO', 'SOAT', 'TECNOMECANICA', 'CAMBIO_ACEITE', 'CITA']

export async function findAll({ search, type, status, date_from, date_to, page = 1, limit = 20 } = {}) {
  const conditions = []
  const params = []

  if (search) {
    conditions.push("(CONCAT(c.name,' ',c.last_name) LIKE ? OR m.plate LIKE ? OR r.message LIKE ?)")
    const t = `%${search}%`; params.push(t, t, t)
  }
  if (type)      { conditions.push('r.type = ?');   params.push(type) }
  if (status)    { conditions.push('r.status = ?'); params.push(status) }
  if (date_from) { conditions.push('r.scheduled_date >= ?'); params.push(date_from) }
  if (date_to)   { conditions.push('r.scheduled_date <= ?'); params.push(date_to) }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (Number(page) - 1) * Number(limit)

  const [[{ total }]] = await getPool().query(
    `SELECT COUNT(*) AS total FROM customer_reminders r
     INNER JOIN clients c ON c.id = r.client_id
     LEFT JOIN motorcycles m ON m.id = r.motorcycle_id ${where}`, params
  )
  const [rows] = await getPool().query(
    `SELECT r.*, CONCAT(c.name,' ',c.last_name) AS client_name, c.phone AS client_phone,
            m.plate, m.brand AS moto_brand, m.model AS moto_model
     FROM customer_reminders r
     INNER JOIN clients c ON c.id = r.client_id
     LEFT JOIN motorcycles m ON m.id = r.motorcycle_id
     ${where} ORDER BY r.scheduled_date ASC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  )
  return { rows, total: Number(total) }
}

export async function findById(id) {
  const [rows] = await getPool().query(
    `SELECT r.*, CONCAT(c.name,' ',c.last_name) AS client_name, c.phone AS client_phone,
            m.plate, m.brand AS moto_brand, m.model AS moto_model
     FROM customer_reminders r
     INNER JOIN clients c ON c.id = r.client_id
     LEFT JOIN motorcycles m ON m.id = r.motorcycle_id
     WHERE r.id = ?`, [id]
  )
  return rows[0] ?? null
}

export async function create({ client_id, motorcycle_id, type, message, scheduled_date, created_by }) {
  const [result] = await getPool().query(
    `INSERT INTO customer_reminders (client_id, motorcycle_id, type, message, scheduled_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [client_id, motorcycle_id ?? null, type, message, scheduled_date, created_by ?? null]
  )
  return findById(result.insertId)
}

export async function update(id, fields) {
  const allowed = ['type', 'message', 'scheduled_date', 'status']
  const sets = []; const params = []
  for (const key of allowed) {
    if (fields[key] !== undefined) { sets.push(`${key} = ?`); params.push(fields[key]) }
  }
  if (!sets.length) return findById(id)
  params.push(id)
  await getPool().query(`UPDATE customer_reminders SET ${sets.join(', ')} WHERE id = ?`, params)
  return findById(id)
}

export async function markSent(id) {
  await getPool().query("UPDATE customer_reminders SET status = 'ENVIADO', sent_at = NOW() WHERE id = ?", [id])
  return findById(id)
}

export async function remove(id) {
  await getPool().query('DELETE FROM customer_reminders WHERE id = ?', [id])
}

// ── CRM Analytics ────────────────────────────────────────────
export async function getCRMStats() {
  const pool = getPool()
  const [[stats]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM customer_reminders WHERE status = 'PENDIENTE') AS pending_reminders,
      (SELECT COUNT(DISTINCT client_id) FROM orders WHERE entry_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)) AS recurring_clients,
      (SELECT COUNT(*) FROM clients c WHERE c.deleted_at IS NULL AND c.id NOT IN (SELECT DISTINCT client_id FROM orders WHERE entry_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH))) AS inactive_clients
  `)
  return {
    pendingReminders: Number(stats.pending_reminders),
    recurringClients: Number(stats.recurring_clients),
    inactiveClients:  Number(stats.inactive_clients),
  }
}

export async function getUpcomingMaintenance() {
  const [rows] = await getPool().query(`
    SELECT m.id AS motorcycle_id, m.plate, m.brand, m.model,
           CONCAT(c.name,' ',c.last_name) AS client_name, c.phone,
           MAX(o.entry_date) AS last_visit,
           DATEDIFF(CURDATE(), MAX(o.entry_date)) AS days_since
    FROM motorcycles m
    INNER JOIN clients c ON c.id = m.client_id AND c.deleted_at IS NULL
    INNER JOIN orders o ON o.motorcycle_id = m.id
    WHERE m.deleted_at IS NULL
    GROUP BY m.id, m.plate, m.brand, m.model, c.name, c.last_name, c.phone
    HAVING days_since >= 60
    ORDER BY days_since DESC
    LIMIT 10
  `)
  return rows
}

export async function getInactiveClients() {
  const [rows] = await getPool().query(`
    SELECT c.id, CONCAT(c.name,' ',c.last_name) AS client_name, c.phone, c.email,
           MAX(o.entry_date) AS last_visit,
           DATEDIFF(CURDATE(), MAX(o.entry_date)) AS days_since,
           COUNT(o.id) AS total_orders
    FROM clients c
    LEFT JOIN orders o ON o.client_id = c.id
    WHERE c.deleted_at IS NULL
    GROUP BY c.id, c.name, c.last_name, c.phone, c.email
    HAVING last_visit IS NULL OR days_since >= 90
    ORDER BY days_since DESC
    LIMIT 10
  `)
  return rows
}

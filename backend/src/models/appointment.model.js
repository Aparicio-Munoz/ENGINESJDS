import { getPool } from '../config/database.js'

// Columnas del listado — incluye nombre del técnico asignado
const LIST_SELECT = `
  SELECT
    a.id, a.client_name, a.client_phone, a.client_email,
    a.motorcycle_plate, a.service_type, a.requested_date,
    a.requested_time, a.status, a.notes,
    a.client_id, a.motorcycle_id, a.assigned_employee_id, a.order_id,
    a.created_at, a.updated_at,
    CONCAT(e.name, ' ', e.last_name) AS assigned_employee_name
  FROM appointments a
  LEFT JOIN employees e
    ON e.id = a.assigned_employee_id AND e.deleted_at IS NULL
`

const SORT_MAP = {
  date:       'a.requested_date ASC, a.requested_time ASC',
  date_desc:  'a.requested_date DESC',
  status:     'a.status ASC, a.requested_date ASC',
  created_at: 'a.created_at DESC',
}

// ── Listado paginado ─────────────────────────────────────────
export async function findAll({
  search,
  status,
  date,
  client_id,
  motorcycle_id,
  sort  = 'date',
  page  = 1,
  limit = 20,
} = {}) {
  const conditions = []
  const params     = []

  if (search) {
    conditions.push(
      `(a.client_name LIKE ? OR a.client_phone LIKE ?
        OR a.motorcycle_plate LIKE ? OR a.service_type LIKE ?)`
    )
    const t = `%${search}%`
    params.push(t, t, t, t)
  }
  if (status)        { conditions.push('a.status = ?');        params.push(status) }
  if (date)          { conditions.push('a.requested_date = ?'); params.push(date) }
  if (client_id)     { conditions.push('a.client_id = ?');     params.push(Number(client_id)) }
  if (motorcycle_id) { conditions.push('a.motorcycle_id = ?'); params.push(Number(motorcycle_id)) }

  const where   = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const orderBy = SORT_MAP[sort] ?? SORT_MAP.date
  const offset  = (Number(page) - 1) * Number(limit)

  const [[{ total }]] = await getPool().query(
    `SELECT COUNT(*) AS total FROM appointments a ${where}`,
    params
  )
  const [rows] = await getPool().query(
    `${LIST_SELECT} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  )

  return { rows, total: Number(total) }
}

// ── Detalle con JOINs opcionales ─────────────────────────────
export async function findById(id) {
  const [rows] = await getPool().query(
    `SELECT
       a.*,
       CONCAT(e.name, ' ', e.last_name) AS assigned_employee_name,
       e.phone                           AS assigned_employee_phone
     FROM appointments a
     LEFT JOIN employees e
       ON e.id = a.assigned_employee_id AND e.deleted_at IS NULL
     WHERE a.id = ?`,
    [id]
  )
  return rows[0] ?? null
}

// Con todos los campos — para snapshot en deletion_logs
export async function findByIdRaw(id) {
  const [rows] = await getPool().query('SELECT * FROM appointments WHERE id = ?', [id])
  return rows[0] ?? null
}

// Usa la vista v_todays_appointments
export async function findToday() {
  const [rows] = await getPool().query('SELECT * FROM v_todays_appointments')
  return rows
}

// Historial de reprogramaciones con datos del autor del cambio
export async function findReschedules(appointmentId) {
  const [rows] = await getPool().query(
    `SELECT
       r.id, r.original_date, r.original_time,
       r.new_date, r.new_time, r.reason, r.notes,
       r.created_at,
       u.username AS rescheduled_by_name
     FROM appointment_reschedules r
     LEFT JOIN users u ON u.id = r.rescheduled_by
     WHERE r.appointment_id = ?
     ORDER BY r.created_at DESC`,
    [appointmentId]
  )
  return rows
}

// KPIs para el dashboard
export async function countByStatus() {
  const [rows] = await getPool().query(
    `SELECT status, COUNT(*) AS total FROM appointments GROUP BY status`
  )
  return rows
}

// ── Creación (ruta pública) ──────────────────────────────────
export async function create({
  client_name,
  client_phone,
  client_email        = null,
  motorcycle_plate,
  service_type,
  requested_date,
  requested_time,
  notes               = null,
  client_id           = null,
  motorcycle_id       = null,
  assigned_employee_id = null,
}) {
  const [result] = await getPool().query(
    `INSERT INTO appointments
       (client_name, client_phone, client_email, motorcycle_plate,
        service_type, requested_date, requested_time, notes,
        client_id, motorcycle_id, assigned_employee_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      client_name, client_phone, client_email, motorcycle_plate,
      service_type, requested_date, requested_time, notes,
      client_id, motorcycle_id, assigned_employee_id,
    ]
  )
  return findById(result.insertId)
}

// ── Actualización parcial ────────────────────────────────────
export async function update(id, fields) {
  const allowed = [
    'status', 'service_type', 'notes',
    'assigned_employee_id', 'order_id',
    'requested_date', 'requested_time',
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
  await getPool().query(`UPDATE appointments SET ${sets.join(', ')} WHERE id = ?`, params)
  return findById(id)
}

// ── Reprogramación ───────────────────────────────────────────
export async function createReschedule({
  appointment_id,
  original_date,
  original_time,
  new_date,
  new_time,
  reason,
  notes          = null,
  rescheduled_by = null,
}) {
  const [result] = await getPool().query(
    `INSERT INTO appointment_reschedules
       (appointment_id, original_date, original_time,
        new_date, new_time, reason, notes, rescheduled_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      appointment_id, original_date, original_time,
      new_date, new_time, reason, notes, rescheduled_by,
    ]
  )

  // Actualizar la cita con la nueva fecha/hora y estado Reprogramada
  await getPool().query(
    `UPDATE appointments
     SET requested_date = ?, requested_time = ?, status = 'Reprogramada'
     WHERE id = ?`,
    [new_date, new_time, appointment_id]
  )

  return result.insertId
}

// ── Eliminación (hard delete — appointments no tiene deleted_at) ─
export async function remove(id) {
  await getPool().query('DELETE FROM appointments WHERE id = ?', [id])
}

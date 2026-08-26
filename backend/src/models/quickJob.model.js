import { getPool } from '../config/database.js'

// created_at es TIMESTAMP (almacenado en UTC real). El servidor gestionado
// corre en UTC, así que DATE(created_at)/CURDATE() sin conversión calculan
// mal el día calendario de Bogotá entre las 7pm y medianoche hora Colombia
// (para esas horas UTC ya está en el día siguiente). Se convierte
// explícitamente a -05:00 (Colombia no tiene horario de verano) en vez de
// depender del time_zone de sesión, para no reinterpretar retroactivamente
// el resto de columnas TIMESTAMP de la base de datos.
const BOGOTA_CREATED_AT = "CONVERT_TZ(created_at, '+00:00', '-05:00')"

const BASE_SELECT = `
  SELECT
    q.id, q.description, q.price, q.employee_id,
    q.created_by, q.created_at,
    CONCAT_WS(' ', e.name, e.last_name) AS employee_name
  FROM quick_jobs q
  JOIN employees e ON e.id = q.employee_id
`

export async function findAll({ employeeId, from, to, page = 1, limit = 50 } = {}) {
  const conditions = ['q.deleted_at IS NULL']
  const params     = []

  if (employeeId) { conditions.push('q.employee_id = ?');        params.push(employeeId) }
  if (from)       { conditions.push(`DATE(CONVERT_TZ(q.created_at, '+00:00', '-05:00')) >= ?`); params.push(from) }
  if (to)         { conditions.push(`DATE(CONVERT_TZ(q.created_at, '+00:00', '-05:00')) <= ?`); params.push(to) }

  const where  = `WHERE ${conditions.join(' AND ')}`
  const offset = (Number(page) - 1) * Number(limit)

  const [[{ total }]] = await getPool().query(
    `SELECT COUNT(*) AS total FROM quick_jobs q ${where}`,
    params
  )
  const [rows] = await getPool().query(
    `${BASE_SELECT} ${where} ORDER BY q.created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  )

  return { rows, total: Number(total) }
}

export async function findById(id) {
  const [rows] = await getPool().query(
    `${BASE_SELECT} WHERE q.id = ? AND q.deleted_at IS NULL`,
    [id]
  )
  return rows[0] ?? null
}

export async function findByIdRaw(id) {
  const [rows] = await getPool().query('SELECT * FROM quick_jobs WHERE id = ?', [id])
  return rows[0] ?? null
}

export async function create({ description, price, employee_id, created_by = null }) {
  const [result] = await getPool().query(
    `INSERT INTO quick_jobs (description, price, employee_id, created_by)
     VALUES (?, ?, ?, ?)`,
    [description, price, employee_id, created_by]
  )
  return findById(result.insertId)
}

export async function softDelete(id) {
  const [result] = await getPool().query(
    'UPDATE quick_jobs SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
    [id]
  )
  return result.affectedRows > 0
}

// Total + listado para un empleado en un rango de fechas (modal de ganancias)
export async function getRangeByEmployee(employeeId, from, to) {
  const dateFilter = `DATE(${BOGOTA_CREATED_AT}) BETWEEN ? AND ?`
  const [[{ total }]] = await getPool().query(
    `SELECT COALESCE(SUM(price), 0) AS total
     FROM quick_jobs
     WHERE employee_id = ? AND ${dateFilter} AND deleted_at IS NULL`,
    [employeeId, from, to]
  )
  const [rows] = await getPool().query(
    `SELECT id, description, price, created_at
     FROM quick_jobs
     WHERE employee_id = ? AND ${dateFilter} AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [employeeId, from, to]
  )
  return { total: Number(total), jobs: rows }
}

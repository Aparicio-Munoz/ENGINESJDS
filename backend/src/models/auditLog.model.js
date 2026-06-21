import { getPool } from '../config/database.js'

export async function findAll({
  search,
  date_from,
  date_to,
  user_id,
  action,
  table_name,
  page  = 1,
  limit = 20,
} = {}) {
  const conditions = []
  const params     = []

  if (search) {
    conditions.push('(a.user_name LIKE ? OR a.description LIKE ? OR a.action LIKE ? OR a.table_name LIKE ?)')
    const t = `%${search}%`
    params.push(t, t, t, t)
  }
  if (date_from) { conditions.push('a.created_at >= ?'); params.push(`${date_from} 00:00:00`) }
  if (date_to)   { conditions.push('a.created_at <= ?'); params.push(`${date_to} 23:59:59`) }
  if (user_id)   { conditions.push('a.user_id = ?');     params.push(Number(user_id)) }
  if (action)    { conditions.push('a.action = ?');      params.push(action) }
  if (table_name){ conditions.push('a.table_name = ?');  params.push(table_name) }

  const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (Number(page) - 1) * Number(limit)

  const [[{ total }]] = await getPool().query(
    `SELECT COUNT(*) AS total FROM audit_logs a ${where}`,
    params
  )

  const [rows] = await getPool().query(
    `SELECT
       a.id, a.user_id, a.user_name, a.role, a.action,
       a.table_name, a.record_id, a.description,
       a.old_values, a.new_values, a.ip_address, a.created_at
     FROM audit_logs a
     ${where}
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  )

  return { rows, total: Number(total) }
}

export async function findDistinctActions() {
  const [rows] = await getPool().query(
    'SELECT DISTINCT action FROM audit_logs ORDER BY action ASC'
  )
  return rows.map((r) => r.action)
}

export async function findDistinctTables() {
  const [rows] = await getPool().query(
    'SELECT DISTINCT table_name FROM audit_logs WHERE table_name IS NOT NULL ORDER BY table_name ASC'
  )
  return rows.map((r) => r.table_name)
}

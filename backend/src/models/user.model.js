import { getPool } from '../config/database.js'

// Campos seguros — nunca devolver password_hash al cliente
const SELECT_SAFE = `
  SELECT
    u.id, u.username, u.email, u.status, u.last_login,
    u.created_at, u.updated_at,
    r.id   AS role_id,
    r.name AS role
  FROM users u
  INNER JOIN roles r ON r.id = u.role_id
`

export async function findAll({ search, role, status } = {}) {
  const conditions = []
  const params = []

  if (search) {
    conditions.push('(u.username LIKE ? OR u.email LIKE ?)')
    params.push(`%${search}%`, `%${search}%`)
  }
  if (role)   { conditions.push('r.name = ?');   params.push(role) }
  if (status) { conditions.push('u.status = ?'); params.push(status) }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const [rows] = await getPool().query(
    `${SELECT_SAFE} ${where} ORDER BY u.created_at DESC`,
    params
  )
  return rows
}

export async function findById(id) {
  const [rows] = await getPool().query(
    `${SELECT_SAFE} WHERE u.id = ?`,
    [id]
  )
  return rows[0] ?? null
}

// Para login: incluye password_hash para comparación con bcrypt
export async function findByEmail(email) {
  const [rows] = await getPool().query(
    `SELECT u.*, r.name AS role
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.email = ?`,
    [email]
  )
  return rows[0] ?? null
}

export async function findRoleByName(name) {
  const [rows] = await getPool().query(
    'SELECT id, name FROM roles WHERE name = ?',
    [name]
  )
  return rows[0] ?? null
}

export async function emailExists(email, excludeId = null) {
  const [rows] = await getPool().query(
    'SELECT id FROM users WHERE email = ? AND id != ?',
    [email, excludeId ?? 0]
  )
  return rows.length > 0
}

export async function usernameExists(username, excludeId = null) {
  const [rows] = await getPool().query(
    'SELECT id FROM users WHERE username = ? AND id != ?',
    [username, excludeId ?? 0]
  )
  return rows.length > 0
}

export async function create({ role_id, username, email, password_hash, status = 'Activo' }) {
  const [result] = await getPool().query(
    'INSERT INTO users (role_id, username, email, password_hash, status) VALUES (?, ?, ?, ?, ?)',
    [role_id, username, email, password_hash, status]
  )
  return findById(result.insertId)
}

export async function update(id, fields) {
  const allowed = ['role_id', 'username', 'email', 'status']
  const sets = []
  const params = []

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`)
      params.push(fields[key])
    }
  }
  if (!sets.length) return findById(id)

  params.push(id)
  await getPool().query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params)
  return findById(id)
}

export async function updatePassword(id, passwordHash) {
  await getPool().query(
    'UPDATE users SET password_hash = ? WHERE id = ?',
    [passwordHash, id]
  )
}

export async function updateLastLogin(id) {
  await getPool().query(
    'UPDATE users SET last_login = NOW() WHERE id = ?',
    [id]
  )
}

export async function remove(id) {
  const [result] = await getPool().query(
    'DELETE FROM users WHERE id = ?',
    [id]
  )
  return result.affectedRows > 0
}

export async function countAdmins(excludeId = null) {
  const [rows] = await getPool().query(
    `SELECT COUNT(*) AS cnt
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'Administrador'
       AND u.status = 'Activo'
       AND u.id != ?`,
    [excludeId ?? 0]
  )
  return rows[0].cnt
}

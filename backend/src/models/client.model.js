import { getPool } from '../config/database.js'

const SAFE_FIELDS = `
  id, document_type, document, name, last_name,
  phone, email, address, city, status, notes,
  created_at, updated_at
`

const SORT_MAP = {
  name:       'name ASC, last_name ASC',
  created_at: 'created_at DESC',
}

export async function findAll({
  search,
  status,
  sort    = 'created_at',
  page    = 1,
  limit   = 20,
} = {}) {
  const conditions = ['deleted_at IS NULL']
  const params     = []

  if (search) {
    conditions.push(
      '(name LIKE ? OR last_name LIKE ? OR document LIKE ? OR phone LIKE ? OR city LIKE ?)'
    )
    const term = `%${search}%`
    params.push(term, term, term, term, term)
  }
  if (status) {
    conditions.push('status = ?')
    params.push(status)
  }

  const where   = `WHERE ${conditions.join(' AND ')}`
  const orderBy = SORT_MAP[sort] ?? SORT_MAP.created_at
  const offset  = (Number(page) - 1) * Number(limit)

  const [[{ total }]] = await getPool().query(
    `SELECT COUNT(*) AS total FROM clients ${where}`,
    params
  )
  const [rows] = await getPool().query(
    `SELECT ${SAFE_FIELDS} FROM clients ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  )

  return { rows, total: Number(total) }
}

export async function findById(id) {
  const [rows] = await getPool().query(
    `SELECT ${SAFE_FIELDS} FROM clients WHERE id = ? AND deleted_at IS NULL`,
    [id]
  )
  return rows[0] ?? null
}

// Incluye todos los campos (para el snapshot en deletion_logs)
export async function findByIdRaw(id) {
  const [rows] = await getPool().query(
    'SELECT * FROM clients WHERE id = ?',
    [id]
  )
  return rows[0] ?? null
}

export async function documentExists(document, excludeId = null) {
  const [rows] = await getPool().query(
    'SELECT id FROM clients WHERE document = ? AND id != ? AND deleted_at IS NULL',
    [document, excludeId ?? 0]
  )
  return rows.length > 0
}

export async function create({
  document_type = 'CC',
  document,
  name,
  last_name,
  phone,
  email   = null,
  address = null,
  city    = 'Bogotá',
  status  = 'Activo',
  notes   = null,
}) {
  const [result] = await getPool().query(
    `INSERT INTO clients
       (document_type, document, name, last_name, phone, email, address, city, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [document_type, document, name, last_name, phone, email, address, city, status, notes]
  )
  return findById(result.insertId)
}

export async function update(id, fields) {
  const allowed = [
    'document_type', 'document', 'name', 'last_name',
    'phone', 'email', 'address', 'city', 'status', 'notes',
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
    `UPDATE clients SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
    params
  )
  return findById(id)
}

export async function softDelete(id) {
  const [result] = await getPool().query(
    'UPDATE clients SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
    [id]
  )
  return result.affectedRows > 0
}

export async function countActiveOrders(clientId) {
  const [rows] = await getPool().query(
    `SELECT COUNT(*) AS cnt FROM orders
     WHERE client_id = ? AND status NOT IN ('Entregada')`,
    [clientId]
  )
  return rows[0].cnt
}

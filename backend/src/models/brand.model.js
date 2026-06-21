import { getPool } from '../config/database.js'

export const CATEGORIES = [
  'Aceites', 'Filtros', 'Llantas', 'Baterías',
  'Pastillas', 'Accesorios', 'Lubricantes', 'Eléctricos',
]

const SORT_MAP = {
  name:       'name ASC',
  category:   'category ASC, name ASC',
  price:      'price DESC',
  created_at: 'created_at DESC',
}

// ── Listado paginado (admin) ─────────────────────────────────
export async function findAll({
  search,
  category,
  status,
  sort  = 'category',
  page  = 1,
  limit = 20,
} = {}) {
  const conditions = []
  const params     = []

  if (search)   { conditions.push('name LIKE ?');   params.push(`%${search}%`) }
  if (category) { conditions.push('category = ?');  params.push(category) }
  if (status)   { conditions.push('status = ?');    params.push(status) }

  const where   = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const orderBy = SORT_MAP[sort] ?? SORT_MAP.category
  const offset  = (Number(page) - 1) * Number(limit)

  const [[{ total }]] = await getPool().query(
    `SELECT COUNT(*) AS total FROM brands ${where}`,
    params
  )
  const [rows] = await getPool().query(
    `SELECT id, name, category, price, status, created_at, updated_at
     FROM brands ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  )

  return { rows, total: Number(total) }
}

export async function findById(id) {
  const [rows] = await getPool().query(
    `SELECT id, name, category, price, status, created_at, updated_at
     FROM brands WHERE id = ?`,
    [id]
  )
  return rows[0] ?? null
}

// ── Unicidad: misma marca no se repite en la misma categoría ─
export async function existsInCategory(name, category, excludeId = null) {
  const [rows] = await getPool().query(
    'SELECT id FROM brands WHERE name = ? AND category = ? AND id != ?',
    [name, category, excludeId ?? 0]
  )
  return rows.length > 0
}

// ── CRUD ─────────────────────────────────────────────────────
export async function create({ name, category, price, status = 'Activo' }) {
  const [result] = await getPool().query(
    'INSERT INTO brands (name, category, price, status) VALUES (?, ?, ?, ?)',
    [name, category, price, status]
  )
  return findById(result.insertId)
}

export async function update(id, fields) {
  const allowed = ['name', 'category', 'price', 'status']
  const sets    = []
  const params  = []

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`)
      params.push(fields[key])
    }
  }
  if (!sets.length) return findById(id)

  params.push(id)
  await getPool().query(`UPDATE brands SET ${sets.join(', ')} WHERE id = ?`, params)
  return findById(id)
}

export async function remove(id) {
  await getPool().query('DELETE FROM brands WHERE id = ?', [id])
}

// ── Público: marcas activas agrupadas por categoría ──────────
export async function findActiveByCategory(category = null) {
  const conditions = [`status = 'Activo'`]
  const params     = []
  if (category) { conditions.push('category = ?'); params.push(category) }

  const [rows] = await getPool().query(
    `SELECT id, name, category, price FROM brands
     WHERE ${conditions.join(' AND ')}
     ORDER BY category ASC, name ASC`,
    params
  )
  return rows
}

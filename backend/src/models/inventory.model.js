import { getPool } from '../config/database.js'
import { ApiError } from '../utils/ApiError.js'

// status es GENERATED ALWAYS AS — nunca incluirlo en SET/VALUES
const SAFE_FIELDS = `
  id, code, name, brand, category, description, unit,
  quantity, min_stock, unit_price, sale_price,
  supplier, image_url, sold_count, status,
  created_at, updated_at
`

const SORT_MAP = {
  name:       'name ASC',
  code:       'code ASC',
  category:   'category ASC, name ASC',
  quantity:   'quantity ASC',
  sold_count: 'sold_count DESC',
  created_at: 'created_at DESC',
}

// ── Listado paginado ─────────────────────────────────────────
export async function findAll({
  search,
  category,
  brand,
  status,
  sort  = 'created_at',
  page  = 1,
  limit = 20,
} = {}) {
  const conditions = []
  const params     = []

  if (search) {
    conditions.push('(name LIKE ? OR code LIKE ? OR brand LIKE ? OR category LIKE ?)')
    const t = `%${search}%`
    params.push(t, t, t, t)
  }
  if (category) { conditions.push('category = ?'); params.push(category) }
  if (brand)    { conditions.push('brand = ?');    params.push(brand)    }
  if (status)   { conditions.push('status = ?');   params.push(status)   }

  const where   = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const orderBy = SORT_MAP[sort] ?? SORT_MAP.created_at
  const offset  = (Number(page) - 1) * Number(limit)

  const [[{ total }]] = await getPool().query(
    `SELECT COUNT(*) AS total FROM inventory ${where}`,
    params
  )
  const [rows] = await getPool().query(
    `SELECT ${SAFE_FIELDS} FROM inventory ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  )

  return { rows, total: Number(total) }
}

export async function findById(id) {
  const [rows] = await getPool().query(
    `SELECT ${SAFE_FIELDS} FROM inventory WHERE id = ?`,
    [id]
  )
  return rows[0] ?? null
}

// Para snapshot completo en deletion_logs
export async function findByIdRaw(id) {
  const [rows] = await getPool().query('SELECT * FROM inventory WHERE id = ?', [id])
  return rows[0] ?? null
}

// ── Unicidad ─────────────────────────────────────────────────
export async function codeExists(code, excludeId = null) {
  const [rows] = await getPool().query(
    'SELECT id FROM inventory WHERE code = ? AND id != ?',
    [code, excludeId ?? 0]
  )
  return rows.length > 0
}

// ── CRUD ─────────────────────────────────────────────────────
export async function create({
  code        = null,
  name        = null,
  brand       = null,
  category    = null,
  description = null,
  unit        = 'unidad',
  quantity    = 0,
  min_stock   = 5,
  unit_price  = 0,
  sale_price  = 0,
  supplier    = null,
  image_url   = null,
}) {
  // status es GENERATED — no se incluye
  const [result] = await getPool().query(
    `INSERT INTO inventory
       (code, name, brand, category, description, unit,
        quantity, min_stock, unit_price, sale_price, supplier, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [code, name, brand, category, description, unit,
     quantity, min_stock, unit_price, sale_price, supplier, image_url]
  )
  return findById(result.insertId)
}

export async function update(id, fields) {
  // status excluido: es GENERATED
  const allowed = [
    'code', 'name', 'brand', 'category', 'description', 'unit',
    'quantity', 'min_stock', 'unit_price', 'sale_price',
    'supplier', 'image_url',
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
  await getPool().query(`UPDATE inventory SET ${sets.join(', ')} WHERE id = ?`, params)
  return findById(id)
}

export async function remove(id) {
  await getPool().query('DELETE FROM inventory WHERE id = ?', [id])
}

// ── Movimientos de stock (con transacción) ───────────────────
export async function applyMovement({
  inventory_id,
  movement_type,   // Entrada | Salida | Ajuste | Devolución
  delta,           // positivo = suma, negativo = resta
  notes   = null,
  created_by = null,
  reference_type = null,
  reference_id   = null,
}) {
  const conn = await getPool().getConnection()
  try {
    await conn.beginTransaction()

    // FOR UPDATE bloquea la fila para evitar race conditions
    const [[current]] = await conn.query(
      'SELECT quantity FROM inventory WHERE id = ? FOR UPDATE',
      [inventory_id]
    )
    if (!current) {
      await conn.rollback()
      throw ApiError.notFound('Repuesto no encontrado')
    }

    const quantityBefore = Number(current.quantity)
    const quantityAfter  = quantityBefore + delta

    if (quantityAfter < 0) {
      await conn.rollback()
      throw ApiError.conflict(
        `Stock insuficiente — disponible: ${quantityBefore}, solicitado: ${Math.abs(delta)}`
      )
    }

    await conn.query(
      'UPDATE inventory SET quantity = ? WHERE id = ?',
      [quantityAfter, inventory_id]
    )

    await conn.query(
      `INSERT INTO inventory_movements
         (inventory_id, movement_type, quantity, quantity_before, quantity_after,
          reference_type, reference_id, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        inventory_id, movement_type, delta,
        quantityBefore, quantityAfter,
        reference_type, reference_id,
        notes, created_by,
      ]
    )

    await conn.commit()
    return { quantityBefore, quantityAfter, delta }
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

// ── Movimientos paginados de un repuesto ─────────────────────
export async function findMovements(inventoryId, { page = 1, limit = 30 } = {}) {
  const offset = (Number(page) - 1) * Number(limit)

  const [[{ total }]] = await getPool().query(
    'SELECT COUNT(*) AS total FROM inventory_movements WHERE inventory_id = ?',
    [inventoryId]
  )
  const [rows] = await getPool().query(
    `SELECT
       m.id, m.movement_type, m.quantity, m.quantity_before, m.quantity_after,
       m.reference_type, m.reference_id, m.notes, m.created_at,
       u.username AS created_by_name
     FROM inventory_movements m
     LEFT JOIN users u ON u.id = m.created_by
     WHERE m.inventory_id = ?
     ORDER BY m.created_at DESC
     LIMIT ? OFFSET ?`,
    [inventoryId, Number(limit), offset]
  )

  return { rows, total: Number(total) }
}

// ── Alertas: usa la vista v_inventory_alerts ─────────────────
export async function findAlerts({ status } = {}) {
  const where  = status ? 'WHERE status = ?' : ''
  const params = status ? [status] : []
  const [rows] = await getPool().query(
    `SELECT * FROM v_inventory_alerts ${where}`,
    params
  )
  return rows
}

// ── Chequeos de negocio ──────────────────────────────────────
export async function countOrderUsage(inventoryId) {
  const [rows] = await getPool().query(
    'SELECT COUNT(*) AS cnt FROM order_items WHERE inventory_id = ?',
    [inventoryId]
  )
  return rows[0].cnt
}

export async function countMovementsUsage(inventoryId) {
  const [rows] = await getPool().query(
    'SELECT COUNT(*) AS cnt FROM inventory_movements WHERE inventory_id = ?',
    [inventoryId]
  )
  return rows[0].cnt
}

// ── Público: productos disponibles por marca/categoría ───────
// Expone solo campos seguros para el cliente — sin costo ni proveedor
export async function findPublicProducts({ brand, category } = {}) {
  const conditions = [`quantity > 0`]
  const params     = []

  if (brand)    { conditions.push('brand = ?');    params.push(brand) }
  if (category) { conditions.push('category = ?'); params.push(category) }

  const [rows] = await getPool().query(
    `SELECT id, code, name, brand, category, description,
            unit, sale_price, image_url, status
     FROM inventory
     WHERE ${conditions.join(' AND ')}
     ORDER BY sold_count DESC, name ASC`,
    params
  )
  return rows
}

// ── Catálogos para filtros frontend ─────────────────────────
export const CATEGORIES = [
  'Transmisión', 'Eléctrico', 'Rodaje y Suspensión', 'Motor', 'Frenos y Dirección',
]

export async function findBrands() {
  const [rows] = await getPool().query(
    'SELECT DISTINCT brand FROM inventory WHERE brand IS NOT NULL ORDER BY brand ASC'
  )
  return rows.map((r) => r.brand)
}

// ── Expuesto para que Órdenes descuente stock (Fase 6) ───────
export async function decrementStock(inventoryId, qty, orderId, userId) {
  return applyMovement({
    inventory_id:   inventoryId,
    movement_type:  'Salida',
    delta:          -qty,
    reference_type: 'order',
    reference_id:   orderId,
    created_by:     userId,
  })
}

export async function returnStock(inventoryId, qty, orderId, userId) {
  return applyMovement({
    inventory_id:   inventoryId,
    movement_type:  'Devolución',
    delta:          qty,
    reference_type: 'order',
    reference_id:   orderId,
    created_by:     userId,
    notes:          'Repuesto devuelto al anular uso en orden',
  })
}

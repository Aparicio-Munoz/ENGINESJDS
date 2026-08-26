import { getPool } from '../config/database.js'

// Campos seguros con JOIN al cliente dueño
const BASE_SELECT = `
  SELECT
    m.id, m.client_id, m.plate, m.brand, m.model, m.year,
    m.engine_cc, m.status, m.notes,
    m.created_at, m.updated_at,
    c.name        AS client_name,
    c.last_name   AS client_last_name,
    c.phone       AS client_phone,
    c.document    AS client_document
  FROM motorcycles m
  LEFT JOIN clients c ON c.id = m.client_id
`

const SORT_MAP = {
  plate:      'm.plate ASC',
  brand:      'm.brand ASC, m.model ASC',
  year:       'm.year DESC',
  created_at: 'm.created_at DESC',
}

// ── Listado paginado ────────────────────────────────────────
export async function findAll({
  search,
  brand,
  model,
  year,
  status,
  client_id,
  sort  = 'created_at',
  page  = 1,
  limit = 20,
} = {}) {
  const conditions = ['m.deleted_at IS NULL', 'c.deleted_at IS NULL']
  const params     = []

  if (search) {
    conditions.push(
      `(m.plate LIKE ? OR m.brand LIKE ? OR m.model LIKE ?
        OR c.name LIKE ? OR c.last_name LIKE ?)`
    )
    const t = `%${search}%`
    params.push(t, t, t, t, t)
  }
  if (brand)     { conditions.push('m.brand = ?');     params.push(brand) }
  if (model)     { conditions.push('m.model LIKE ?');  params.push(`%${model}%`) }
  if (year)      { conditions.push('m.year = ?');      params.push(Number(year)) }
  if (status)    { conditions.push('m.status = ?');    params.push(status) }
  if (client_id) { conditions.push('m.client_id = ?'); params.push(Number(client_id)) }

  const where   = `WHERE ${conditions.join(' AND ')}`
  const orderBy = SORT_MAP[sort] ?? SORT_MAP.created_at
  const offset  = (Number(page) - 1) * Number(limit)

  const [[{ total }]] = await getPool().query(
    `SELECT COUNT(*) AS total FROM motorcycles m
     LEFT JOIN clients c ON c.id = m.client_id ${where}`,
    params
  )
  const [rows] = await getPool().query(
    `${BASE_SELECT} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  )

  return { rows, total: Number(total) }
}

export async function findById(id) {
  const [rows] = await getPool().query(
    `${BASE_SELECT} WHERE m.id = ? AND m.deleted_at IS NULL`,
    [id]
  )
  return rows[0] ?? null
}

// Con todos los campos — para snapshot en deletion_logs
export async function findByIdRaw(id) {
  const [rows] = await getPool().query(
    'SELECT * FROM motorcycles WHERE id = ?',
    [id]
  )
  return rows[0] ?? null
}

// ── Unicidad ────────────────────────────────────────────────
export async function plateExists(plate, excludeId = null) {
  const [rows] = await getPool().query(
    'SELECT id FROM motorcycles WHERE plate = ? AND id != ? AND deleted_at IS NULL',
    [plate, excludeId ?? 0]
  )
  return rows.length > 0
}

// ── CRUD ─────────────────────────────────────────────────────
export async function create({
  client_id = null,
  plate     = null,
  brand     = null,
  model     = null,
  year      = null,
  engine_cc = null,
  status    = 'En servicio',
  notes     = null,
}) {
  const [result] = await getPool().query(
    `INSERT INTO motorcycles
       (client_id, plate, brand, model, year, engine_cc, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [client_id, plate, brand, model, year, engine_cc, status, notes]
  )
  return findById(result.insertId)
}

export async function update(id, fields) {
  const allowed = [
    'client_id', 'plate', 'brand', 'model', 'year',
    'engine_cc', 'status', 'notes',
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
    `UPDATE motorcycles SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
    params
  )
  return findById(id)
}

// plate y vin tienen UNIQUE KEY a nivel de tabla, sin importar deleted_at —
// si no se liberan al eliminar, esa placa/VIN queda bloqueada para siempre
// (ni el mismo cliente ni otro podrán volver a registrarla), aunque
// plateExists() diga que está libre por ignorar los soft-deleted.
// El valor original queda preservado en deletion_logs.entity_data.
export async function softDelete(id) {
  // plate es VARCHAR(10) — el placeholder debe caber siempre, por eso
  // solo usa el id (máx. 9 dígitos + 1 letra = 10) y no el valor original.
  const [result] = await getPool().query(
    `UPDATE motorcycles
     SET deleted_at = NOW(),
         plate = CONCAT('D', id),
         vin   = NULL
     WHERE id = ? AND deleted_at IS NULL`,
    [id]
  )
  return result.affectedRows > 0
}

// ── Validaciones de negocio ──────────────────────────────────
export async function countActiveOrders(motorcycleId) {
  const [rows] = await getPool().query(
    `SELECT COUNT(*) AS cnt FROM orders
     WHERE motorcycle_id = ? AND status NOT IN ('Entregada')`,
    [motorcycleId]
  )
  return rows[0].cnt
}

export async function countActiveAppointments(motorcycleId) {
  const [rows] = await getPool().query(
    `SELECT COUNT(*) AS cnt FROM appointments
     WHERE motorcycle_id = ? AND status IN ('Pendiente', 'Confirmada', 'Reprogramada')`,
    [motorcycleId]
  )
  return rows[0].cnt
}

// ── Historial completo ───────────────────────────────────────
export async function getHistory(id) {
  const pool = getPool()

  const [
    [motorcycleRows],
    [appointmentRows],
    [orderRows],
    [tecnoRows],
  ] = await Promise.all([
    // Moto + cliente completo
    pool.query(
      `SELECT m.*,
              c.name AS client_name, c.last_name AS client_last_name,
              c.document_type, c.document AS client_document,
              c.phone AS client_phone,
              c.city
       FROM motorcycles m
       LEFT JOIN clients c ON c.id = m.client_id
       WHERE m.id = ? AND m.deleted_at IS NULL`,
      [id]
    ),

    // Citas (más recientes primero)
    pool.query(
      `SELECT a.id, a.requested_date, a.requested_time, a.service_type,
              a.status, a.notes, a.client_name, a.client_phone,
              CONCAT(e.name, ' ', e.last_name) AS assigned_employee,
              a.created_at
       FROM appointments a
       LEFT JOIN employees e ON e.id = a.assigned_employee_id
       WHERE a.motorcycle_id = ?
       ORDER BY a.requested_date DESC, a.requested_time DESC`,
      [id]
    ),

    // Órdenes con resumen de servicios y repuestos
    pool.query(
      `SELECT
         o.id, o.order_number, o.status, o.entry_date,
         o.actual_delivery_date,
         o.diagnostic_notes, o.work_notes,
         o.labor_cost, o.parts_cost, o.discount, o.final_price,
         CONCAT(e.name, ' ', e.last_name) AS assigned_employee,
         COUNT(DISTINCT os.id)             AS services_count,
         COUNT(DISTINCT oi.id)             AS parts_count,
         GROUP_CONCAT(
           DISTINCT os.service_name
           ORDER BY os.id SEPARATOR ' | '
         )                                 AS services_list,
         GROUP_CONCAT(
           DISTINCT CONCAT(oi.part_name, ' ×', oi.quantity)
           ORDER BY oi.id SEPARATOR ' | '
         )                                 AS parts_list
       FROM orders o
       LEFT JOIN employees    e  ON e.id  = o.assigned_employee_id
       LEFT JOIN order_services os ON os.order_id = o.id
       LEFT JOIN order_items   oi ON oi.order_id = o.id
       WHERE o.motorcycle_id = ?
       GROUP BY o.id, o.order_number, o.status, o.entry_date,
                o.actual_delivery_date,
                o.diagnostic_notes, o.work_notes,
                o.labor_cost, o.parts_cost, o.discount, o.final_price,
                e.name, e.last_name
       ORDER BY o.entry_date DESC`,
      [id]
    ),

    // Revisiones tecnomecánicas
    pool.query(
      `SELECT id, inspection_date, expiry_date, rtm_number, status, notes, document_url, created_at
       FROM tecnomecanica
       WHERE motorcycle_id = ?
       ORDER BY inspection_date DESC`,
      [id]
    ),
  ])

  return {
    motorcycle:   motorcycleRows[0] ?? null,
    appointments: appointmentRows,
    orders:       orderRows,
    tecnomecanica: tecnoRows,
  }
}

// Marcas únicas — para filtro en el frontend
export async function findBrands() {
  const [rows] = await getPool().query(
    `SELECT DISTINCT brand FROM motorcycles
     WHERE deleted_at IS NULL ORDER BY brand ASC`
  )
  return rows.map((r) => r.brand)
}

import { getPool } from '../config/database.js'

export async function getMotorcycleInfo(motorcycleId) {
  const [rows] = await getPool().query(
    `SELECT m.*, CONCAT(c.name, ' ', c.last_name) AS client_name,
            c.phone AS client_phone, c.document AS client_document, c.email AS client_email
     FROM motorcycles m
     INNER JOIN clients c ON c.id = m.client_id
     WHERE m.id = ? AND m.deleted_at IS NULL`,
    [motorcycleId]
  )
  return rows[0] ?? null
}

export async function getTimeline(motorcycleId) {
  const [rows] = await getPool().query(
    `SELECT order_id, order_number, tracking_token, order_status, entry_date,
            actual_delivery_date, diagnostic_notes, work_notes,
            labor_cost, parts_cost, discount, final_price,
            technician_name, technician_specialty
     FROM vw_motorcycle_history
     WHERE motorcycle_id = ?
     ORDER BY entry_date DESC`,
    [motorcycleId]
  )
  return rows
}

export async function getStats(motorcycleId) {
  const pool = getPool()
  const [[row]] = await pool.query(
    `SELECT
       COUNT(*)                         AS total_visits,
       COALESCE(SUM(final_price), 0)   AS total_spent,
       COALESCE(AVG(final_price), 0)   AS average_spent,
       MIN(entry_date)                  AS first_visit,
       MAX(entry_date)                  AS last_visit
     FROM orders
     WHERE motorcycle_id = ?`,
    [motorcycleId]
  )

  const [[favSvc]] = await pool.query(
    `SELECT os.service_name, COUNT(*) AS cnt
     FROM order_services os
     INNER JOIN orders o ON o.id = os.order_id
     WHERE o.motorcycle_id = ?
     GROUP BY os.service_name
     ORDER BY cnt DESC
     LIMIT 1`,
    [motorcycleId]
  )

  return {
    totalVisits:     Number(row.total_visits),
    totalSpent:      Number(row.total_spent),
    averageSpent:    Math.round(Number(row.average_spent)),
    firstVisit:      row.first_visit,
    lastVisit:       row.last_visit,
    favoriteService: favSvc?.service_name ?? null,
  }
}

export async function getServicesHistory(motorcycleId) {
  const [rows] = await getPool().query(
    `SELECT os.service_name, os.quantity, os.unit_price, os.total_price, os.created_at,
            o.order_number, CONCAT(e.name, ' ', e.last_name) AS technician
     FROM order_services os
     INNER JOIN orders o ON o.id = os.order_id
     LEFT JOIN employees e ON e.id = os.employee_id AND e.deleted_at IS NULL
     WHERE o.motorcycle_id = ?
     ORDER BY os.created_at DESC`,
    [motorcycleId]
  )
  return rows
}

export async function getPartsHistory(motorcycleId) {
  const [rows] = await getPool().query(
    `SELECT oi.part_name, oi.quantity, oi.unit_price, oi.total_price, oi.created_at,
            o.order_number, i.code AS part_code, i.brand AS part_brand
     FROM order_items oi
     INNER JOIN orders o ON o.id = oi.order_id
     LEFT JOIN inventory i ON i.id = oi.inventory_id
     WHERE o.motorcycle_id = ?
     ORDER BY oi.created_at DESC`,
    [motorcycleId]
  )
  return rows
}

export async function getYearlyCosts(motorcycleId) {
  const [rows] = await getPool().query(
    `SELECT YEAR(entry_date) AS year,
            COUNT(*) AS orders_count,
            COALESCE(SUM(final_price), 0) AS total_cost
     FROM orders
     WHERE motorcycle_id = ?
     GROUP BY YEAR(entry_date)
     ORDER BY year ASC`,
    [motorcycleId]
  )
  return rows
}

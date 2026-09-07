import { getPool } from '../config/database.js'

function toSearchTerm(query) {
  return `%${query}%`
}

export async function findOperational(query, limit) {
  const term = toSearchTerm(query)
  const pool = getPool()

  const [[clients], [motorcycles], [orders]] = await Promise.all([
    pool.query(
      `SELECT c.id,
              CONCAT_WS(' ', c.name, c.last_name) AS title,
              CONCAT_WS(' · ', c.document, c.phone) AS subtitle
       FROM clients c
       WHERE c.deleted_at IS NULL
         AND (c.name LIKE ? OR c.last_name LIKE ? OR c.document LIKE ? OR c.phone LIKE ?)
       ORDER BY c.name ASC, c.last_name ASC
       LIMIT ?`,
      [term, term, term, term, limit]
    ),
    pool.query(
      `SELECT m.id,
              CONCAT(m.plate, ' — ', m.brand, ' ', m.model) AS title,
              CONCAT_WS(' ', c.name, c.last_name) AS subtitle
       FROM motorcycles m
       INNER JOIN clients c ON c.id = m.client_id AND c.deleted_at IS NULL
       WHERE m.deleted_at IS NULL
         AND (m.plate LIKE ? OR m.brand LIKE ? OR m.model LIKE ?
              OR c.name LIKE ? OR c.last_name LIKE ?)
       ORDER BY m.plate ASC
       LIMIT ?`,
      [term, term, term, term, term, limit]
    ),
    pool.query(
      `SELECT o.id,
              o.order_number AS title,
              CONCAT_WS(' · ', CONCAT_WS(' ', c.name, c.last_name), m.plate, o.status) AS subtitle
       FROM orders o
       INNER JOIN clients c ON c.id = o.client_id
       INNER JOIN motorcycles m ON m.id = o.motorcycle_id
       WHERE o.order_number LIKE ?
          OR c.name LIKE ? OR c.last_name LIKE ? OR m.plate LIKE ?
       ORDER BY o.entry_date DESC
       LIMIT ?`,
      [term, term, term, term, limit]
    ),
  ])

  return { clients, motorcycles, orders }
}

export async function findAdministrative(query, limit) {
  const term = toSearchTerm(query)
  const pool = getPool()
  const [operational, [inventory], [employees], [users]] = await Promise.all([
    findOperational(query, limit),
    pool.query(
      `SELECT i.id,
              i.name AS title,
              CONCAT_WS(' · ', i.code, i.brand, i.status) AS subtitle
       FROM inventory i
       WHERE i.name LIKE ? OR i.code LIKE ? OR i.brand LIKE ?
       ORDER BY i.name ASC
       LIMIT ?`,
      [term, term, term, limit]
    ),
    pool.query(
      `SELECT e.id,
              CONCAT_WS(' ', e.name, e.last_name) AS title,
              CONCAT_WS(' · ', e.specialty, e.phone) AS subtitle
       FROM employees e
       WHERE e.deleted_at IS NULL
         AND (e.name LIKE ? OR e.last_name LIKE ? OR e.document LIKE ?
              OR e.specialty LIKE ? OR e.phone LIKE ? OR e.email LIKE ?)
       ORDER BY e.name ASC, e.last_name ASC
       LIMIT ?`,
      [term, term, term, term, term, term, limit]
    ),
    pool.query(
      `SELECT u.id,
              u.username AS title,
              CONCAT_WS(' · ', u.email, r.name, u.status) AS subtitle
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.username LIKE ? OR u.email LIKE ?
       ORDER BY u.username ASC
       LIMIT ?`,
      [term, term, limit]
    ),
  ])

  return { ...operational, inventory, employees, users }
}

export async function findForTechnician(employeeId, query, limit) {
  const term = toSearchTerm(query)
  const pool = getPool()
  const [[motorcycles], [orders]] = await Promise.all([
    pool.query(
      `SELECT DISTINCT m.id,
              CONCAT(m.plate, ' — ', m.brand, ' ', m.model) AS title,
              CONCAT_WS(' ', c.name, c.last_name) AS subtitle
       FROM orders o
       INNER JOIN motorcycles m ON m.id = o.motorcycle_id AND m.deleted_at IS NULL
       INNER JOIN clients c ON c.id = m.client_id AND c.deleted_at IS NULL
       WHERE o.assigned_employee_id = ?
         AND (m.plate LIKE ? OR m.brand LIKE ? OR m.model LIKE ?
              OR c.name LIKE ? OR c.last_name LIKE ?)
       ORDER BY m.plate ASC
       LIMIT ?`,
      [employeeId, term, term, term, term, term, limit]
    ),
    pool.query(
      `SELECT o.id,
              o.order_number AS title,
              CONCAT_WS(' · ', CONCAT_WS(' ', c.name, c.last_name), m.plate, o.status) AS subtitle
       FROM orders o
       INNER JOIN clients c ON c.id = o.client_id
       INNER JOIN motorcycles m ON m.id = o.motorcycle_id
       WHERE o.assigned_employee_id = ?
         AND (o.order_number LIKE ? OR c.name LIKE ? OR c.last_name LIKE ? OR m.plate LIKE ?)
       ORDER BY o.entry_date DESC
       LIMIT ?`,
      [employeeId, term, term, term, term, limit]
    ),
  ])

  return { motorcycles, orders }
}

import { getPool } from '../config/database.js'
import { ApiError } from '../utils/ApiError.js'

const STATUS_MAP = {
  Pendiente:            'Recibida',
  'En proceso':         'En reparación',
  'En reparación':      'En reparación',
  'Esperando repuesto': 'Esperando repuesto',
  Listo:                'Lista para entrega',
  'Lista para entrega': 'Lista para entrega',
  Entregada:            'Entregada',
}

export async function getByToken(token) {
  const pool = getPool()

  const [orderRows] = await pool.query(
    `SELECT
       o.id, o.order_number, o.status, o.entry_date,
       o.estimated_delivery_date, o.actual_delivery_date,
       o.diagnostic_notes,
       m.plate, m.brand, m.model, m.year, m.color, m.engine_cc
     FROM orders o
     INNER JOIN motorcycles m ON m.id = o.motorcycle_id
     WHERE o.tracking_token = ?`,
    [token]
  )

  if (!orderRows.length) {
    throw ApiError.notFound('No se encontró información con este código de seguimiento')
  }

  const order = orderRows[0]

  const [services] = await pool.query(
    `SELECT service_name, description, quantity, status
     FROM order_services
     WHERE order_id = ?
     ORDER BY created_at ASC`,
    [order.id]
  )

  const [history] = await pool.query(
    `SELECT previous_status, new_status, created_at
     FROM order_status_history
     WHERE order_id = ?
     ORDER BY created_at ASC`,
    [order.id]
  )

  return {
    order_number: order.order_number,
    status: STATUS_MAP[order.status] ?? order.status,
    status_raw: order.status,
    entry_date: order.entry_date,
    estimated_delivery_date: order.estimated_delivery_date,
    actual_delivery_date: order.actual_delivery_date,
    diagnostic: order.diagnostic_notes,
    motorcycle: {
      plate: order.plate,
      brand: order.brand,
      model: order.model,
      year: order.year,
      color: order.color,
      engine_cc: order.engine_cc,
    },
    services: services.map((s) => ({
      name: s.service_name,
      description: s.description,
      quantity: s.quantity,
      status: s.status,
    })),
    timeline: history.map((h) => ({
      from: STATUS_MAP[h.previous_status] ?? h.previous_status,
      to: STATUS_MAP[h.new_status] ?? h.new_status,
      date: h.created_at,
    })),
  }
}

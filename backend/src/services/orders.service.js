import { getPool } from '../config/database.js'
import * as OrderModel from '../models/order.model.js'
import { ApiError } from '../utils/ApiError.js'
import { auditEntity, AUDIT_ACTIONS } from './audit.service.js'

// ── CRUD principal ────────────────────────────────────────────

export async function getAll(query = {}) {
  const { search, status, employee_id, client_id, motorcycle_id,
          date_from, date_to, sort, page = 1, limit = 20 } = query

  const { rows, total } = await OrderModel.findAll({
    search, status, employee_id, client_id, motorcycle_id,
    date_from, date_to, sort, page, limit,
  })
  return { data: rows, total: Number(total), page: Number(page), limit: Number(limit) }
}

export async function getActive() {
  return OrderModel.findActive()
}

export async function getById(id) {
  const order = await OrderModel.findById(id)
  if (!order) throw ApiError.notFound('Orden de trabajo no encontrada')
  return order
}

export async function getHistory(id) {
  const history = await OrderModel.findHistory(id)
  if (!history) throw ApiError.notFound('Orden de trabajo no encontrada')
  return history
}

export async function create(data, createdById, actor = {}) {
  const {
    client_id, motorcycle_id, assigned_employee_id, appointment_id,
    problem_description, estimated_delivery_date, labor_cost, discount,
  } = data

  await _assertClientExists(client_id)
  await _assertMotorcycleExists(motorcycle_id)
  if (assigned_employee_id) await _assertEmployeeExists(assigned_employee_id)
  if (appointment_id)       await _assertAppointmentExists(appointment_id)

  // Verificar que la moto pertenece al cliente
  await _assertMotorcycleBelongsToClient(motorcycle_id, client_id)

  const order = await OrderModel.create({
    motorcycle_id,
    client_id,
    appointment_id:          appointment_id ?? null,
    assigned_employee_id:    assigned_employee_id ?? null,
    diagnostic_notes:        problem_description,
    estimated_delivery_date: estimated_delivery_date ?? null,
    labor_cost:              labor_cost ?? 0,
    discount:                discount   ?? 0,
    created_by:              createdById,
  })

  // Si viene de una cita, vincular la orden a la cita
  if (appointment_id) {
    await getPool().query(
      `UPDATE appointments SET order_id = ? WHERE id = ?`,
      [order.id, appointment_id]
    )
  }

  await auditEntity(AUDIT_ACTIONS.CREAR_ORDEN, {
    actor: { userId: createdById, userName: actor.userName, role: actor.role, ip: actor.ip },
    tableName: 'orders',
    recordId: order.id,
    newValues: {
      order_number: order.order_number,
      client_id, motorcycle_id,
      assigned_employee_id: assigned_employee_id ?? null,
      status: order.status,
    },
    description: `Orden ${order.order_number} creada`,
  })

  return order
}

export async function update(id, data) {
  const order = await getById(id)

  if (order.status === 'Entregada') {
    throw ApiError.conflict('No se puede modificar una orden ya entregada')
  }

  if (data.assigned_employee_id) {
    await _assertEmployeeExists(data.assigned_employee_id)
  }

  return OrderModel.update(id, data)
}

export async function remove(id, deletedById, reason) {
  if (!reason?.trim()) {
    throw ApiError.badRequest('El motivo de eliminación es requerido')
  }

  const order = await OrderModel.findByIdRaw(id)
  if (!order) throw ApiError.notFound('Orden de trabajo no encontrada')

  if (order.status === 'Entregada') {
    throw ApiError.conflict('No se puede eliminar una orden que ya fue entregada')
  }

  await getPool().query(
    `INSERT INTO deletion_logs
       (entity_type, entity_id, entity_label, entity_data, reason, deleted_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      'orders',
      id,
      `${order.order_number} — OT #${id}`,
      JSON.stringify(order),
      reason.trim(),
      deletedById,
    ]
  )

  await OrderModel.remove(id)
}

// ── Cambio de estado ──────────────────────────────────────────

export async function changeStatus(id, { status, notes }, changedById, actor = {}) {
  const order = await getById(id)

  if (order.status === 'Entregada') {
    throw ApiError.conflict(
      'La orden ya fue entregada — no se puede cambiar su estado'
    )
  }

  if (status === 'Entregada') {
    throw ApiError.badRequest(
      'Para cerrar una orden use el endpoint POST /api/orders/:id/close'
    )
  }

  const updated = await OrderModel.updateStatus(id, { status })

  await auditEntity(AUDIT_ACTIONS.CAMBIAR_ESTADO, {
    actor: { userId: changedById, userName: actor.userName, role: actor.role, ip: actor.ip },
    tableName: 'orders',
    recordId: id,
    oldValues: { status: order.status },
    newValues: { status, notes: notes ?? null },
    description: `Orden #${id}: ${order.status} → ${status}`,
  })

  return updated
}

// ── Cierre de orden ───────────────────────────────────────────

export async function close(id, { payment_method, payment_status, notes }, closedById) {
  const order = await getById(id)

  if (order.status === 'Entregada') {
    throw ApiError.conflict('La orden ya fue entregada')
  }

  if (!order.assigned_employee_id) {
    throw ApiError.conflict(
      'No se puede cerrar la orden sin un técnico asignado'
    )
  }

  // Verificar que tiene al menos un servicio registrado
  const [[{ svc_count }]] = await getPool().query(
    'SELECT COUNT(*) AS svc_count FROM order_services WHERE order_id = ?',
    [id]
  )
  if (Number(svc_count) === 0) {
    throw ApiError.conflict(
      'No se puede cerrar la orden sin servicios registrados'
    )
  }

  // Actualizar status → Entregada (trigger crea sales + status_history automáticamente)
  const updatedOrder = await OrderModel.updateStatus(id, {
    status:               'Entregada',
    actual_delivery_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
  })

  // Actualizar el registro de venta con datos de pago opcionales
  if (payment_method || payment_status || notes) {
    await OrderModel.updateSalePayment(id, { payment_method, payment_status, notes })
  }

  // Marcar la cita vinculada como Atendida
  if (order.appointment_id) {
    await getPool().query(
      `UPDATE appointments
       SET status = 'Atendida'
       WHERE id = ? AND status NOT IN ('Atendida', 'Cancelada')`,
      [order.appointment_id]
    )
  }

  return updatedOrder
}

// ── Servicios ─────────────────────────────────────────────────

export async function addService(orderId, data) {
  const order = await getById(orderId)

  if (order.status === 'Entregada') {
    throw ApiError.conflict('No se pueden agregar servicios a una orden entregada')
  }

  const { service_catalog_id, service_name, description,
          quantity = 1, unit_price, employee_id, notes } = data

  let resolvedName  = service_name
  let resolvedPrice = unit_price

  // Si viene de catálogo, resolver nombre y precio base como valores por defecto
  if (service_catalog_id) {
    const [[catalog]] = await getPool().query(
      'SELECT name, base_price FROM service_catalog WHERE id = ? AND is_active = 1',
      [service_catalog_id]
    )
    if (!catalog) {
      throw ApiError.notFound(`Servicio de catálogo #${service_catalog_id} no encontrado`)
    }
    resolvedName  = resolvedName  ?? catalog.name
    resolvedPrice = resolvedPrice ?? catalog.base_price
  }

  if (!resolvedName) {
    throw ApiError.badRequest(
      'service_name es requerido cuando no se especifica service_catalog_id'
    )
  }
  if (resolvedPrice === undefined || resolvedPrice === null) {
    throw ApiError.badRequest(
      'unit_price es requerido cuando no se especifica service_catalog_id'
    )
  }

  if (employee_id) await _assertEmployeeExists(employee_id)

  return OrderModel.addService(orderId, {
    service_catalog_id: service_catalog_id ?? null,
    service_name:       resolvedName,
    description:        description ?? null,
    quantity,
    unit_price:         resolvedPrice,
    employee_id:        employee_id ?? null,
    notes:              notes ?? null,
  })
}

export async function removeService(orderId, serviceId) {
  const order = await getById(orderId)

  if (order.status === 'Entregada') {
    throw ApiError.conflict('No se pueden eliminar servicios de una orden entregada')
  }

  const removed = await OrderModel.removeService(orderId, serviceId)
  if (!removed) {
    throw ApiError.notFound(`Servicio #${serviceId} no encontrado en la orden #${orderId}`)
  }
}

// ── Repuestos ─────────────────────────────────────────────────

export async function addPart(orderId, { inventory_id, quantity }) {
  const order = await getById(orderId)

  if (order.status === 'Entregada') {
    throw ApiError.conflict('No se pueden agregar repuestos a una orden entregada')
  }

  const result = await OrderModel.addPart(orderId, { inventory_id, quantity })

  if (result.error === 'not_found') {
    throw ApiError.notFound(`Repuesto con ID ${inventory_id} no encontrado`)
  }
  if (result.error === 'insufficient_stock') {
    throw ApiError.conflict(
      `Stock insuficiente — disponible: ${result.available}, solicitado: ${quantity}`
    )
  }

  return result.item
}

export async function removePart(orderId, itemId) {
  const order = await getById(orderId)

  if (order.status === 'Entregada') {
    throw ApiError.conflict('No se pueden eliminar repuestos de una orden entregada')
  }

  const removed = await OrderModel.removePart(orderId, itemId)
  if (!removed) {
    throw ApiError.notFound(`Repuesto #${itemId} no encontrado en la orden #${orderId}`)
  }
}

// ── Catálogo de servicios ─────────────────────────────────────

export async function getServiceCatalog(query = {}) {
  return OrderModel.findServiceCatalog(query)
}

// ── FK helpers ────────────────────────────────────────────────

async function _assertClientExists(id) {
  const [[row]] = await getPool().query(
    'SELECT id FROM clients WHERE id = ? AND deleted_at IS NULL',
    [id]
  )
  if (!row) throw ApiError.notFound(`Cliente con ID ${id} no encontrado`)
}

async function _assertMotorcycleExists(id) {
  const [[row]] = await getPool().query(
    'SELECT id, client_id FROM motorcycles WHERE id = ? AND deleted_at IS NULL',
    [id]
  )
  if (!row) throw ApiError.notFound(`Motocicleta con ID ${id} no encontrada`)
  return row
}

async function _assertMotorcycleBelongsToClient(motorcycleId, clientId) {
  const [[row]] = await getPool().query(
    'SELECT id FROM motorcycles WHERE id = ? AND client_id = ? AND deleted_at IS NULL',
    [motorcycleId, clientId]
  )
  if (!row) {
    throw ApiError.conflict(
      `La motocicleta #${motorcycleId} no pertenece al cliente #${clientId}`
    )
  }
}

async function _assertEmployeeExists(id) {
  const [[row]] = await getPool().query(
    `SELECT id FROM employees
     WHERE id = ? AND deleted_at IS NULL AND status IN ('Activo', 'Vacaciones')`,
    [id]
  )
  if (!row) throw ApiError.notFound(`Empleado con ID ${id} no encontrado o inactivo`)
}

async function _assertAppointmentExists(id) {
  const [[row]] = await getPool().query(
    `SELECT id FROM appointments WHERE id = ? AND status NOT IN ('Cancelada')`,
    [id]
  )
  if (!row) {
    throw ApiError.notFound(`Cita #${id} no encontrada o está cancelada`)
  }
}

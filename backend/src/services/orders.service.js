import { getPool } from '../config/database.js'
import * as OrderModel from '../models/order.model.js'
import * as MotorcycleModel from '../models/motorcycle.model.js'
import { ApiError } from '../utils/ApiError.js'
import { auditEntity, AUDIT_ACTIONS } from './audit.service.js'

// Estados seleccionables desde el selector "Estado de la motocicleta"
// del modal Editar Orden. 'Entregada' se excluye — sólo se alcanza
// cerrando la orden con close(), que ya exige técnico + servicios.
const MOTORCYCLE_STATUSES  = ['En servicio', 'En reparación', 'Lista para entrega', 'Entregada']
const MOTO_TO_ORDER_STATUS = {
  'En servicio':        'En proceso',
  'En reparación':      'En reparación',
  'Lista para entrega': 'Lista para entrega',
}

// motorcycles y orders deben quedar siempre sincronizados —
// se invoca en cada cambio de orders.status
async function _syncMotorcycleStatus(motorcycleId, orderStatus) {
  const mapped = OrderModel.ORDER_TO_MOTO_STATUS[orderStatus]
  if (!mapped) return
  await MotorcycleModel.update(motorcycleId, { status: mapped })
}

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
    problem_description, labor_cost, discount,
  } = data

  if (client_id)       await _assertClientExists(client_id)
  if (motorcycle_id)   await _assertMotorcycleExists(motorcycle_id)
  const assignedEmployee = assigned_employee_id
    ? await _assertEmployeeExists(assigned_employee_id)
    : null
  if (appointment_id)       await _assertAppointmentExists(appointment_id)

  // Verificar que la moto pertenece al cliente — sólo aplica si ambos vienen
  if (motorcycle_id && client_id) {
    await _assertMotorcycleBelongsToClient(motorcycle_id, client_id)
  }

  // Al crear no hay servicios ni repuestos aún — el descuento no puede superar la mano de obra
  const laborCost   = Number(labor_cost ?? 0)
  const discountAmt = Number(discount ?? 0)
  if (discountAmt > laborCost) {
    throw ApiError.badRequest(
      `El descuento no puede ser mayor que el total de la orden (${laborCost})`
    )
  }

  const order = await OrderModel.create({
    motorcycle_id,
    client_id,
    appointment_id:          appointment_id ?? null,
    assigned_employee_id:    assigned_employee_id ?? null,
    technician_commission_percent: Number(assignedEmployee?.commission_percent ?? 0),
    commission_is_estimated: 0,
    diagnostic_notes:        problem_description,
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

  const isTechnicianChanging = Object.prototype.hasOwnProperty.call(data, 'assigned_employee_id')
  const assignedEmployee = data.assigned_employee_id
    ? await _assertEmployeeExists(data.assigned_employee_id)
    : null

  const { motorcycle_status, ...orderFields } = data

  // La comisión se congela al asignar o reasignar el técnico. Así, cambios
  // posteriores en la ficha del empleado no alteran la utilidad de una orden.
  if (isTechnicianChanging) {
    orderFields.technician_commission_percent = Number(assignedEmployee?.commission_percent ?? 0)
    orderFields.commission_is_estimated = 0
  }

  if (motorcycle_status !== undefined && motorcycle_status !== null && motorcycle_status !== '') {
    if (!MOTORCYCLE_STATUSES.includes(motorcycle_status)) {
      throw ApiError.badRequest(
        `Estado de motocicleta inválido — válidos: ${MOTORCYCLE_STATUSES.join(', ')}`
      )
    }
    if (motorcycle_status === 'Entregada') {
      throw ApiError.badRequest(
        'Para marcar la motocicleta como entregada, cierra la orden con "Cerrar orden y entregar".'
      )
    }
  }

  // El descuento nunca puede superar el total (mano de obra + servicios + repuestos)
  const laborCost = orderFields.labor_cost !== undefined ? Number(orderFields.labor_cost) : Number(order.labor_cost)
  const discount   = orderFields.discount  !== undefined ? Number(orderFields.discount)  : Number(order.discount)
  const maxDiscount = laborCost + Number(order.parts_cost) + Number(order.services_cost)
  if (discount > maxDiscount) {
    throw ApiError.badRequest(
      `El descuento no puede ser mayor que el total de la orden (${maxDiscount})`
    )
  }

  await OrderModel.update(id, orderFields)

  if (motorcycle_status && order.motorcycle_id) {
    await MotorcycleModel.update(order.motorcycle_id, { status: motorcycle_status })
    const mappedOrderStatus = MOTO_TO_ORDER_STATUS[motorcycle_status]
    if (mappedOrderStatus && mappedOrderStatus !== order.status) {
      await OrderModel.updateStatus(id, { status: mappedOrderStatus })
    }
  }

  return OrderModel.findById(id)
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

  await OrderModel.updateStatus(id, { status })
  if (order.motorcycle_id) await _syncMotorcycleStatus(order.motorcycle_id, status)

  await auditEntity(AUDIT_ACTIONS.CAMBIAR_ESTADO, {
    actor: { userId: changedById, userName: actor.userName, role: actor.role, ip: actor.ip },
    tableName: 'orders',
    recordId: id,
    oldValues: { status: order.status },
    newValues: { status, notes: notes ?? null },
    description: `Orden #${id}: ${order.status} → ${status}`,
  })

  return OrderModel.findById(id)
}

// ── Cierre de orden ───────────────────────────────────────────

export async function close(id, { payment_method, payment_status, notes }, _closedById) {
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
  await OrderModel.updateStatus(id, {
    status:               'Entregada',
    actual_delivery_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
  })
  if (order.motorcycle_id) await MotorcycleModel.update(order.motorcycle_id, { status: 'Entregada' })

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

  return OrderModel.findById(id)
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

  const [[svc]] = await getPool().query(
    'SELECT total_price FROM order_services WHERE id = ? AND order_id = ?',
    [serviceId, orderId]
  )
  if (!svc) {
    throw ApiError.notFound(`Servicio #${serviceId} no encontrado en la orden #${orderId}`)
  }
  _assertDiscountFitsAfterRemoval(order, svc.total_price)

  await OrderModel.removeService(orderId, serviceId)
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

  const [[part]] = await getPool().query(
    'SELECT total_price FROM order_items WHERE id = ? AND order_id = ?',
    [itemId, orderId]
  )
  if (!part) {
    throw ApiError.notFound(`Repuesto #${itemId} no encontrado en la orden #${orderId}`)
  }
  _assertDiscountFitsAfterRemoval(order, part.total_price)

  await OrderModel.removePart(orderId, itemId)
}

// ── Catálogo de servicios ─────────────────────────────────────

export async function getServiceCatalog(query = {}) {
  return OrderModel.findServiceCatalog(query)
}

// ── Validaciones de totales ────────────────────────────────────

// Eliminar un servicio/repuesto reduce el total — si el descuento
// vigente quedaría por encima del nuevo total, se bloquea la baja
function _assertDiscountFitsAfterRemoval(order, amountBeingRemoved) {
  const newTotal = Number(order.labor_cost) + Number(order.parts_cost) +
    Number(order.services_cost) - Number(amountBeingRemoved)
  if (Number(order.discount) > newTotal) {
    throw ApiError.conflict(
      `No se puede eliminar — el descuento actual (${order.discount}) quedaría por encima del nuevo total (${newTotal}). Reduce el descuento primero.`
    )
  }
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
    `SELECT id, commission_percent FROM employees
     WHERE id = ? AND deleted_at IS NULL AND status IN ('Activo', 'Vacaciones')`,
    [id]
  )
  if (!row) throw ApiError.notFound(`Empleado con ID ${id} no encontrado o inactivo`)
  return row
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

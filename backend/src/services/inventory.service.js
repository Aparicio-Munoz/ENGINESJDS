import { getPool } from '../config/database.js'
import * as InventoryModel from '../models/inventory.model.js'
import { ApiError } from '../utils/ApiError.js'
import { auditEntity, AUDIT_ACTIONS } from './audit.service.js'

export async function getAll({ search, category, brand, status, sort, page = 1, limit = 20 } = {}) {
  const { rows, total } = await InventoryModel.findAll({
    search, category, brand, status, sort, page, limit,
  })
  return {
    data:  rows,
    total: Number(total),
    page:  Number(page),
    limit: Number(limit),
  }
}

export async function getById(id) {
  const item = await InventoryModel.findById(id)
  if (!item) throw ApiError.notFound('Repuesto no encontrado')
  return item
}

export async function getAlerts({ status } = {}) {
  return InventoryModel.findAlerts({ status })
}

export async function getCategories() {
  return InventoryModel.CATEGORIES
}

export async function getBrands() {
  return InventoryModel.findBrands()
}

export async function getMovements(id, { page = 1, limit = 30 } = {}) {
  await getById(id)
  const { rows, total } = await InventoryModel.findMovements(id, { page, limit })
  return {
    data:  rows,
    total: Number(total),
    page:  Number(page),
    limit: Number(limit),
  }
}

export async function create(data) {
  const { code, unit_price, sale_price } = data

  if (await InventoryModel.codeExists(code)) {
    throw ApiError.conflict(`El código ${code} ya está registrado`)
  }

  _assertPrices(unit_price, sale_price)

  return InventoryModel.create(data)
}

export async function update(id, data, actor = {}) {
  const current = await getById(id)

  if (data.code !== undefined && data.code !== current.code) {
    if (await InventoryModel.codeExists(data.code, id)) {
      throw ApiError.conflict(`El código ${data.code} ya está registrado`)
    }
  }

  // Validar precios con valores combinados (parcial puede venir incompleto)
  const unitPrice = data.unit_price  !== undefined ? Number(data.unit_price)  : Number(current.unit_price)
  const salePrice = data.sale_price  !== undefined ? Number(data.sale_price)  : Number(current.sale_price)
  _assertPrices(unitPrice, salePrice)

  // Cantidad no puede ser negativa
  if (data.quantity !== undefined && Number(data.quantity) < 0) {
    throw ApiError.badRequest('La cantidad no puede ser negativa')
  }

  const updated = await InventoryModel.update(id, data)
  await auditEntity(AUDIT_ACTIONS.EDITAR_INVENTARIO, {
    actor, tableName: 'inventory', recordId: id, oldValues: current, newValues: updated,
  })

  return updated
}

export async function remove(id, deletedById, reason, actor = {}) {
  if (!reason?.trim()) {
    throw ApiError.badRequest('El motivo de eliminación es requerido')
  }

  const item = await InventoryModel.findByIdRaw(id)
  if (!item) throw ApiError.notFound('Repuesto no encontrado')

  const usageCount = await InventoryModel.countOrderUsage(id)
  if (usageCount > 0) {
    throw ApiError.conflict(
      `El repuesto tiene historial de uso en ${usageCount} orden(es) de trabajo. ` +
      `No puede ser eliminado para preservar el histórico.`
    )
  }

  const movCount = await InventoryModel.countMovementsUsage(id)
  if (movCount > 0) {
    throw ApiError.conflict(
      `El repuesto tiene ${movCount} movimiento(s) de stock registrados. ` +
      `No puede ser eliminado para preservar el histórico de inventario.`
    )
  }

  await getPool().query(
    `INSERT INTO deletion_logs
       (entity_type, entity_id, entity_label, entity_data, reason, deleted_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      'inventory',
      id,
      `[${item.code}] ${item.name}`,
      JSON.stringify(item),
      reason.trim(),
      deletedById,
    ]
  )

  await InventoryModel.remove(id)

  await auditEntity(AUDIT_ACTIONS.ELIMINAR_REPUESTO, {
    actor: { userId: deletedById, ip: actor.ip },
    tableName: 'inventory', recordId: id, oldValues: item,
  })
}

// ── Movimientos manuales ─────────────────────────────────────
export async function recordEntry(id, qty, userId, notes) {
  await getById(id)
  _assertPositiveQty(qty)

  const result = await InventoryModel.applyMovement({
    inventory_id:  id,
    movement_type: 'Entrada',
    delta:         Number(qty),
    notes,
    created_by:    userId,
  })

  return { ...result, item: await InventoryModel.findById(id) }
}

export async function recordOutput(id, qty, userId, notes) {
  await getById(id)
  _assertPositiveQty(qty)

  const result = await InventoryModel.applyMovement({
    inventory_id:  id,
    movement_type: 'Salida',
    delta:         -Number(qty),
    notes,
    created_by:    userId,
  })

  return { ...result, item: await InventoryModel.findById(id) }
}

export async function recordAdjustment(id, newQuantity, userId, notes) {
  const item = await getById(id)

  if (Number(newQuantity) < 0) {
    throw ApiError.badRequest('La cantidad no puede ser negativa')
  }

  const delta = Number(newQuantity) - Number(item.quantity)

  const result = await InventoryModel.applyMovement({
    inventory_id:  id,
    movement_type: 'Ajuste',
    delta,
    notes:         notes ?? `Ajuste manual: ${item.quantity} → ${newQuantity}`,
    created_by:    userId,
  })

  return { ...result, item: await InventoryModel.findById(id) }
}

// ── Helpers privados ─────────────────────────────────────────
function _assertPrices(unitPrice, salePrice) {
  if (Number(salePrice) < Number(unitPrice)) {
    throw ApiError.badRequest(
      'El precio de venta debe ser mayor o igual al precio de compra'
    )
  }
}

function _assertPositiveQty(qty) {
  if (!qty || Number(qty) <= 0 || !Number.isInteger(Number(qty))) {
    throw ApiError.badRequest('La cantidad debe ser un entero positivo mayor a 0')
  }
}

import { getPool } from '../config/database.js'
import * as MotorcycleModel from '../models/motorcycle.model.js'
import { ApiError } from '../utils/ApiError.js'
import { auditEntity, AUDIT_ACTIONS } from './audit.service.js'

export async function getAll({
  search, brand, model, year, status, client_id,
  sort, page = 1, limit = 20,
} = {}) {
  const { rows, total } = await MotorcycleModel.findAll({
    search, brand, model, year, status, client_id, sort, page, limit,
  })
  return {
    data:  rows,
    total: Number(total),
    page:  Number(page),
    limit: Number(limit),
  }
}

export async function getById(id) {
  const motorcycle = await MotorcycleModel.findById(id)
  if (!motorcycle) throw ApiError.notFound('Motocicleta no encontrada')
  return motorcycle
}

export async function create(data, actor = {}) {
  await _assertClientExists(data.client_id)

  if (await MotorcycleModel.plateExists(data.plate)) {
    throw ApiError.conflict(`La placa ${data.plate} ya está registrada`)
  }
  if (data.vin && await MotorcycleModel.vinExists(data.vin)) {
    throw ApiError.conflict(`El VIN ${data.vin} ya está registrado`)
  }

  const created = await MotorcycleModel.create(data)
  await auditEntity(AUDIT_ACTIONS.CREAR_MOTO, {
    actor, tableName: 'motorcycles', recordId: created.id, newValues: created,
    description: `Moto ${created.plate} — ${created.brand} ${created.model} registrada`,
  })
  return created
}

export async function update(id, data, actor = {}) {
  const before = await getById(id)

  if (data.client_id !== undefined) {
    await _assertClientExists(data.client_id)
  }
  if (data.plate !== undefined) {
    if (await MotorcycleModel.plateExists(data.plate, id)) {
      throw ApiError.conflict(`La placa ${data.plate} ya está registrada`)
    }
  }
  if (data.vin !== undefined && data.vin) {
    if (await MotorcycleModel.vinExists(data.vin, id)) {
      throw ApiError.conflict(`El VIN ${data.vin} ya está registrado`)
    }
  }

  const updated = await MotorcycleModel.update(id, data)
  await auditEntity(AUDIT_ACTIONS.EDITAR_MOTO, {
    actor, tableName: 'motorcycles', recordId: id, oldValues: before, newValues: updated,
    description: `Moto ${updated.plate} editada`,
  })
  return updated
}

export async function remove(id, deletedById, reason, actor = {}) {
  if (!reason?.trim()) {
    throw ApiError.badRequest('El motivo de eliminación es requerido')
  }

  const motorcycle = await MotorcycleModel.findByIdRaw(id)
  if (!motorcycle || motorcycle.deleted_at !== null) {
    throw ApiError.notFound('Motocicleta no encontrada')
  }

  // Bloquear si tiene órdenes activas
  const activeOrders = await MotorcycleModel.countActiveOrders(id)
  if (activeOrders > 0) {
    throw ApiError.conflict(
      `La moto tiene ${activeOrders} orden(es) de trabajo activa(s). ` +
      `Ciérralas antes de eliminarla.`
    )
  }

  // Bloquear si tiene citas activas
  const activeAppointments = await MotorcycleModel.countActiveAppointments(id)
  if (activeAppointments > 0) {
    throw ApiError.conflict(
      `La moto tiene ${activeAppointments} cita(s) activa(s). ` +
      `Cancélalas antes de eliminarla.`
    )
  }

  await getPool().query(
    `INSERT INTO deletion_logs
       (entity_type, entity_id, entity_label, entity_data, reason, deleted_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      'motorcycles',
      id,
      `${motorcycle.plate} — ${motorcycle.brand} ${motorcycle.model} ${motorcycle.year}`,
      JSON.stringify(motorcycle),
      reason.trim(),
      deletedById,
    ]
  )

  await MotorcycleModel.softDelete(id)

  await auditEntity(AUDIT_ACTIONS.ELIMINAR_MOTO, {
    actor: { userId: deletedById, ip: actor.ip, userName: actor.userName, role: actor.role },
    tableName: 'motorcycles', recordId: id, oldValues: motorcycle,
    description: `Moto ${motorcycle.plate} eliminada — ${reason}`,
  })
}

export async function getHistory(id) {
  const history = await MotorcycleModel.getHistory(id)

  if (!history.motorcycle) {
    throw ApiError.notFound('Motocicleta no encontrada')
  }

  // Separar datos del cliente del objeto motorcycle para respuesta limpia
  const {
    client_name, client_last_name, client_document, client_document_type,
    client_phone, client_email, address, city,
    ...moto
  } = history.motorcycle

  return {
    motorcycle: moto,
    client: {
      id:            moto.client_id,
      name:          client_name,
      last_name:     client_last_name,
      document:      client_document,
      document_type: client_document_type,
      phone:         client_phone,
      email:         client_email,
      address,
      city,
    },
    appointments:  history.appointments,
    orders:        history.orders,
    tecnomecanica: history.tecnomecanica,
  }
}

export async function getBrands() {
  return MotorcycleModel.findBrands()
}

// ── Helper privado ───────────────────────────────────────────
async function _assertClientExists(clientId) {
  const [rows] = await getPool().query(
    'SELECT id FROM clients WHERE id = ? AND deleted_at IS NULL',
    [clientId]
  )
  if (!rows.length) {
    throw ApiError.notFound(`Cliente con ID ${clientId} no encontrado`)
  }
}

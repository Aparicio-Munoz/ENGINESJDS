import { getPool } from '../config/database.js'
import * as MotorcycleModel from '../models/motorcycle.model.js'
import { ApiError } from '../utils/ApiError.js'
import { auditEntity, AUDIT_ACTIONS } from './audit.service.js'

// Placa/marca/modelo son opcionales: un string vacío no debe guardarse
// como '' (rompería la unicidad de `plate`) sino como NULL, igual que un
// campo omitido.
function emptyToNull(value) {
  if (typeof value !== 'string') return value ?? null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function normalizeYear(value) {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return Number(value)
}

function normalizeEngineCc(value) {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return Number(value)
}

function displayLabel(m) {
  return [m.plate, [m.brand, m.model].filter(Boolean).join(' ')].filter(Boolean).join(' — ') || `Moto #${m.id}`
}

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
  const payload = {
    ...data,
    plate: emptyToNull(data.plate)?.toUpperCase() ?? null,
    brand: emptyToNull(data.brand),
    model: emptyToNull(data.model),
    year:  normalizeYear(data.year),
  }

  if (payload.client_id) {
    await _assertClientExists(payload.client_id)
  }

  if (payload.plate && await MotorcycleModel.plateExists(payload.plate)) {
    throw ApiError.conflict(`La placa ${payload.plate} ya está registrada`)
  }

  const created = await MotorcycleModel.create(payload)
  await auditEntity(AUDIT_ACTIONS.CREAR_MOTO, {
    actor, tableName: 'motorcycles', recordId: created.id, newValues: created,
    description: `Moto ${displayLabel(created)} registrada`,
  })
  return created
}

export async function update(id, data, actor = {}) {
  const before = await getById(id)

  const payload = { ...data }
  if ('plate'     in payload) payload.plate     = emptyToNull(payload.plate)?.toUpperCase() ?? null
  if ('brand'     in payload) payload.brand     = emptyToNull(payload.brand)
  if ('model'     in payload) payload.model     = emptyToNull(payload.model)
  if ('year'      in payload) payload.year      = normalizeYear(payload.year)
  if ('engine_cc' in payload) payload.engine_cc = normalizeEngineCc(payload.engine_cc)
  if ('client_id' in payload) payload.client_id = payload.client_id ? Number(payload.client_id) : null

  if (payload.client_id) {
    await _assertClientExists(payload.client_id)
  }
  if (payload.plate !== undefined && payload.plate !== null) {
    if (await MotorcycleModel.plateExists(payload.plate, id)) {
      throw ApiError.conflict(`La placa ${payload.plate} ya está registrada`)
    }
  }
  const updated = await MotorcycleModel.update(id, payload)
  await auditEntity(AUDIT_ACTIONS.EDITAR_MOTO, {
    actor, tableName: 'motorcycles', recordId: id, oldValues: before, newValues: updated,
    description: `Moto ${displayLabel(updated)} editada`,
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
      displayLabel(motorcycle),
      JSON.stringify(motorcycle),
      reason.trim(),
      deletedById,
    ]
  )

  await MotorcycleModel.softDelete(id)

  await auditEntity(AUDIT_ACTIONS.ELIMINAR_MOTO, {
    actor: { userId: deletedById, ip: actor.ip, userName: actor.userName, role: actor.role },
    tableName: 'motorcycles', recordId: id, oldValues: motorcycle,
    description: `Moto ${displayLabel(motorcycle)} eliminada — ${reason}`,
  })
}

export async function getHistory(id) {
  const history = await MotorcycleModel.getHistory(id)

  if (!history.motorcycle) {
    throw ApiError.notFound('Motocicleta no encontrada')
  }

  // Separar datos del cliente del objeto motorcycle para respuesta limpia
  const {
    client_name, client_last_name, client_document, document_type,
    client_phone, city,
    ...moto
  } = history.motorcycle

  return {
    motorcycle: moto,
    client: {
      id:            moto.client_id,
      name:          client_name,
      last_name:     client_last_name,
      document:      client_document,
      document_type,
      phone:         client_phone,
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

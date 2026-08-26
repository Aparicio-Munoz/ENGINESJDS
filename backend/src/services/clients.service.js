import { getPool } from '../config/database.js'
import * as ClientModel from '../models/client.model.js'
import { ApiError } from '../utils/ApiError.js'
import { auditEntity, AUDIT_ACTIONS } from './audit.service.js'

// Los campos de contacto son opcionales: un string vacío no debe
// almacenarse como '' (rompería la unicidad de `document` y ensuciaría
// búsquedas/reportes) sino como NULL, igual que un campo omitido.
function emptyToNull(value) {
  if (typeof value !== 'string') return value ?? null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function displayName(client) {
  return [client.name, client.last_name].filter(Boolean).join(' ') || `Cliente #${client.id}`
}

export async function getAll({ search, status, sort, page = 1, limit = 20 } = {}) {
  const { rows, total } = await ClientModel.findAll({ search, status, sort, page, limit })
  return {
    data:  rows,
    total: Number(total),
    page:  Number(page),
    limit: Number(limit),
  }
}

export async function getById(id) {
  const client = await ClientModel.findById(id)
  if (!client) throw ApiError.notFound('Cliente no encontrado')
  return client
}

export async function create(data, actor = {}) {
  const payload = {
    ...data,
    document_type: data.document_type || 'CC',
    document:      emptyToNull(data.document),
    name:          emptyToNull(data.name),
    last_name:     emptyToNull(data.last_name),
    phone:         emptyToNull(data.phone),
  }

  if (payload.document && await ClientModel.documentExists(payload.document)) {
    throw ApiError.conflict(`El documento ${payload.document} ya está registrado`)
  }
  const created = await ClientModel.create(payload)
  await auditEntity(AUDIT_ACTIONS.CREAR_CLIENTE, {
    actor, tableName: 'clients', recordId: created.id, newValues: created,
    description: `Cliente ${displayName(created)}${created.document ? ` (${created.document})` : ''} registrado`,
  })
  return created
}

export async function update(id, data, actor = {}) {
  const before = await getById(id)

  const payload = { ...data }
  if ('document'  in payload) payload.document  = emptyToNull(payload.document)
  if ('name'      in payload) payload.name      = emptyToNull(payload.name)
  if ('last_name' in payload) payload.last_name = emptyToNull(payload.last_name)
  if ('phone'     in payload) payload.phone     = emptyToNull(payload.phone)

  if (payload.document !== undefined && payload.document !== null) {
    if (await ClientModel.documentExists(payload.document, id)) {
      throw ApiError.conflict(`El documento ${payload.document} ya está registrado`)
    }
  }

  const updated = await ClientModel.update(id, payload)
  await auditEntity(AUDIT_ACTIONS.EDITAR_CLIENTE, {
    actor, tableName: 'clients', recordId: id, oldValues: before, newValues: updated,
    description: `Cliente ${displayName(updated)} editado`,
  })
  return updated
}

export async function remove(id, deletedById, reason, actor = {}) {
  if (!reason?.trim()) {
    throw ApiError.badRequest('El motivo de eliminación es requerido')
  }

  const client = await ClientModel.findByIdRaw(id)
  if (!client || client.deleted_at !== null) {
    throw ApiError.notFound('Cliente no encontrado')
  }

  // Bloquear si tiene órdenes de trabajo activas
  const activeCount = await ClientModel.countActiveOrders(id)
  if (activeCount > 0) {
    throw ApiError.conflict(
      `El cliente tiene ${activeCount} orden(es) de trabajo activa(s). ` +
      `Ciérralas antes de eliminar el cliente.`
    )
  }

  await getPool().query(
    `INSERT INTO deletion_logs
       (entity_type, entity_id, entity_label, entity_data, reason, deleted_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      'clients',
      id,
      displayName(client),
      JSON.stringify(client),
      reason.trim(),
      deletedById,
    ]
  )

  await ClientModel.softDelete(id)

  await auditEntity(AUDIT_ACTIONS.ELIMINAR_CLIENTE, {
    actor: { userId: deletedById, userName: actor.userName, role: actor.role, ip: actor.ip },
    tableName: 'clients', recordId: id, oldValues: client,
    description: `Cliente ${displayName(client)} eliminado — ${reason}`,
  })
}

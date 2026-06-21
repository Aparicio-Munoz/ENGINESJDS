import { getPool } from '../config/database.js'
import * as ClientModel from '../models/client.model.js'
import { ApiError } from '../utils/ApiError.js'
import { auditEntity, AUDIT_ACTIONS } from './audit.service.js'

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
  if (await ClientModel.documentExists(data.document)) {
    throw ApiError.conflict(`El documento ${data.document} ya está registrado`)
  }
  const created = await ClientModel.create(data)
  await auditEntity(AUDIT_ACTIONS.CREAR_CLIENTE, {
    actor, tableName: 'clients', recordId: created.id, newValues: created,
    description: `Cliente ${created.name} ${created.last_name} (${created.document}) registrado`,
  })
  return created
}

export async function update(id, data, actor = {}) {
  const before = await getById(id)

  if (data.document !== undefined) {
    if (await ClientModel.documentExists(data.document, id)) {
      throw ApiError.conflict(`El documento ${data.document} ya está registrado`)
    }
  }

  const updated = await ClientModel.update(id, data)
  await auditEntity(AUDIT_ACTIONS.EDITAR_CLIENTE, {
    actor, tableName: 'clients', recordId: id, oldValues: before, newValues: updated,
    description: `Cliente ${updated.name} ${updated.last_name} editado`,
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
      `${client.name} ${client.last_name}`,
      JSON.stringify(client),
      reason.trim(),
      deletedById,
    ]
  )

  await ClientModel.softDelete(id)

  await auditEntity(AUDIT_ACTIONS.ELIMINAR_CLIENTE, {
    actor: { userId: deletedById, userName: actor.userName, role: actor.role, ip: actor.ip },
    tableName: 'clients', recordId: id, oldValues: client,
    description: `Cliente ${client.name} ${client.last_name} eliminado — ${reason}`,
  })
}

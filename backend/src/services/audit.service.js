import { getPool } from '../config/database.js'
import { logger } from '../utils/logger.js'

export const AUDIT_ACTIONS = {
  CREAR_CLIENTE:        'CREAR_CLIENTE',
  EDITAR_CLIENTE:       'EDITAR_CLIENTE',
  ELIMINAR_CLIENTE:     'ELIMINAR_CLIENTE',
  CREAR_MOTO:          'CREAR_MOTO',
  EDITAR_MOTO:         'EDITAR_MOTO',
  ELIMINAR_MOTO:       'ELIMINAR_MOTO',
  CREAR_ORDEN:         'CREAR_ORDEN',
  CAMBIAR_ESTADO:      'CAMBIAR_ESTADO',
  EDITAR_INVENTARIO:   'EDITAR_INVENTARIO',
  ELIMINAR_REPUESTO:   'ELIMINAR_REPUESTO',
  CREAR_EMPLEADO:      'CREAR_EMPLEADO',
  CREAR_MARCA:         'CREAR_MARCA',
  EDITAR_MARCA:        'EDITAR_MARCA',
  ELIMINAR_MARCA:      'ELIMINAR_MARCA',
}

function toJson(value) {
  if (value === null || value === undefined) return null
  return JSON.stringify(value)
}

/**
 * Registra un evento de auditoría completo.
 * Compatible con auth (logAudit) y con entidades (auditEntity).
 */
export async function logAudit(action, {
  userId      = null,
  userName    = null,
  role        = null,
  ip          = null,
  ipAddress   = null,
  tableName   = null,
  recordId    = null,
  oldValues   = null,
  newValues   = null,
  description = null,
  details     = null,
} = {}) {
  try {
    await getPool().query(
      `INSERT INTO audit_logs
         (user_id, user_name, role, action, table_name, record_id,
          old_values, new_values, description, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId ?? null,
        userName ?? null,
        role ?? null,
        action,
        tableName ?? null,
        recordId ?? null,
        toJson(oldValues),
        toJson(newValues ?? details),
        description ?? null,
        ipAddress ?? ip ?? null,
      ]
    )
  } catch (err) {
    logger.error('Error al registrar auditoría', { action, error: err.message })
  }
}

/**
 * Atajo para auditar cambios de entidades.
 * actor: { userId, userName, role, ip }
 */
export async function auditEntity(action, {
  actor = {},
  tableName,
  recordId,
  oldValues   = null,
  newValues   = null,
  description = null,
}) {
  await logAudit(action, {
    userId:      actor.userId ?? null,
    userName:    actor.userName ?? null,
    role:        actor.role ?? null,
    ipAddress:   actor.ip ?? null,
    tableName,
    recordId,
    oldValues,
    newValues,
    description,
  })
}

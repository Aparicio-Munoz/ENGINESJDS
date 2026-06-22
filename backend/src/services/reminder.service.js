import * as ReminderModel from '../models/reminder.model.js'
import { ApiError } from '../utils/ApiError.js'
import { logAudit } from './audit.service.js'
import { emit, EVENTS } from '../socket/index.js'

export async function getAll(query) {
  const { rows, total } = await ReminderModel.findAll(query)
  return { data: rows, total, page: Number(query.page || 1), limit: Number(query.limit || 20) }
}

export async function getById(id) {
  const r = await ReminderModel.findById(id)
  if (!r) throw ApiError.notFound('Recordatorio no encontrado')
  return r
}

export async function create(data, actor = {}) {
  if (!data.client_id) throw ApiError.badRequest('client_id es requerido')
  if (!data.message?.trim()) throw ApiError.badRequest('El mensaje es requerido')
  if (!data.scheduled_date) throw ApiError.badRequest('La fecha programada es requerida')

  const reminder = await ReminderModel.create({ ...data, created_by: actor.userId })

  await logAudit('CREATE_REMINDER', {
    userId: actor.userId, userName: actor.userName, role: actor.role, ipAddress: actor.ip,
    tableName: 'customer_reminders', recordId: reminder.id,
    description: `Recordatorio ${reminder.type} para ${reminder.client_name} programado ${data.scheduled_date}`,
  })
  return reminder
}

export async function update(id, data, actor = {}) {
  await getById(id)
  return ReminderModel.update(id, data)
}

export async function remove(id, actor = {}) {
  const r = await getById(id)
  await ReminderModel.remove(id)
  await logAudit('DELETE_REMINDER', {
    userId: actor.userId, userName: actor.userName, role: actor.role, ipAddress: actor.ip,
    tableName: 'customer_reminders', recordId: id,
    description: `Recordatorio ${r.type} para ${r.client_name} eliminado`,
  })
}

export async function send(id, actor = {}) {
  const r = await getById(id)
  if (r.status === 'ENVIADO') throw ApiError.conflict('Este recordatorio ya fue enviado')
  if (r.status === 'CANCELADO') throw ApiError.conflict('No se puede enviar un recordatorio cancelado')

  const updated = await ReminderModel.markSent(id)

  await logAudit('SEND_REMINDER', {
    userId: actor.userId, userName: actor.userName, role: actor.role, ipAddress: actor.ip,
    tableName: 'customer_reminders', recordId: id,
    description: `Recordatorio ${r.type} enviado a ${r.client_name} (${r.client_phone})`,
  })

  emit(EVENTS.CRM_REMINDER_SENT, {
    client: r.client_name, motorcycle: r.plate ?? '—', type: r.type,
  })

  const phone = (r.client_phone || '').replace(/\D/g, '')
  const target = phone.startsWith('57') ? phone : `57${phone}`
  const waUrl = `https://wa.me/${target}?text=${encodeURIComponent(r.message)}`

  return { ...updated, whatsapp_url: waUrl }
}

export async function getCRMDashboard() {
  const [stats, upcoming, inactive] = await Promise.all([
    ReminderModel.getCRMStats(),
    ReminderModel.getUpcomingMaintenance(),
    ReminderModel.getInactiveClients(),
  ])
  return { stats, upcoming, inactive }
}

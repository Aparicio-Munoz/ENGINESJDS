import { getPool } from '../config/database.js'
import * as AppointmentModel from '../models/appointment.model.js'
import { ApiError } from '../utils/ApiError.js'

// ── Horarios del taller ─────────────────────────────────────
const SCHEDULE = {
  weekday: { open: '08:00', close: '18:00' }, // Lun – Vie
  saturday: { open: '08:00', close: '15:00' }, // Sáb
  sunday: null,                                 // Cerrado
}

// ── CRUD principal ───────────────────────────────────────────
export async function getAll({
  search, status, date, client_id, motorcycle_id,
  sort, page = 1, limit = 20,
} = {}) {
  const { rows, total } = await AppointmentModel.findAll({
    search, status, date, client_id, motorcycle_id, sort, page, limit,
  })
  return { data: rows, total: Number(total), page: Number(page), limit: Number(limit) }
}

export async function getById(id) {
  const appt = await AppointmentModel.findById(id)
  if (!appt) throw ApiError.notFound('Cita no encontrada')
  return appt
}

export async function getToday() {
  return AppointmentModel.findToday()
}

export async function getHistory(id) {
  const appt = await AppointmentModel.findById(id)
  if (!appt) throw ApiError.notFound('Cita no encontrada')

  const reschedules = await AppointmentModel.findReschedules(id)

  // Datos del cliente registrado (si existe)
  let client = null
  if (appt.client_id) {
    const [rows] = await getPool().query(
      `SELECT id, document_type, document, name, last_name, phone, city, status
       FROM clients WHERE id = ? AND deleted_at IS NULL`,
      [appt.client_id]
    )
    client = rows[0] ?? null
  }

  // Datos de la motocicleta registrada (si existe)
  let motorcycle = null
  if (appt.motorcycle_id) {
    const [rows] = await getPool().query(
      `SELECT id, plate, brand, model, year, engine_cc, status
       FROM motorcycles WHERE id = ? AND deleted_at IS NULL`,
      [appt.motorcycle_id]
    )
    motorcycle = rows[0] ?? null
  }

  return { appointment: appt, reschedules, client, motorcycle }
}

export async function create(data) {
  _assertFutureDateTime(data.requested_date, data.requested_time)
  _assertBusinessHours(data.requested_date, data.requested_time)

  // Verificar FK opcionales si vienen en el body
  if (data.client_id) await _assertClientExists(data.client_id)
  if (data.motorcycle_id) await _assertMotorcycleExists(data.motorcycle_id)
  if (data.assigned_employee_id) await _assertEmployeeExists(data.assigned_employee_id)

  return AppointmentModel.create(data)
}

export async function update(id, data) {
  const appt = await getById(id)

  // No permite editar citas ya canceladas o atendidas mediante PUT general
  if (['Cancelada', 'Atendida'].includes(appt.status)) {
    throw ApiError.conflict(
      `No se puede editar una cita con estado "${appt.status}"`
    )
  }

  if (data.assigned_employee_id) {
    await _assertEmployeeExists(data.assigned_employee_id)
  }

  // Si se cambia fecha/hora, validar horario de taller
  if (data.requested_date || data.requested_time) {
    const newDate = data.requested_date ?? appt.requested_date
    const newTime = data.requested_time ?? appt.requested_time
    _assertFutureDateTime(newDate, newTime)
    _assertBusinessHours(newDate, newTime)
  }

  return AppointmentModel.update(id, data)
}

export async function remove(id, deletedById, reason) {
  if (!reason?.trim()) {
    throw ApiError.badRequest('El motivo de eliminación es requerido')
  }

  const appt = await AppointmentModel.findByIdRaw(id)
  if (!appt) throw ApiError.notFound('Cita no encontrada')

  if (appt.status === 'Atendida') {
    throw ApiError.conflict('No se puede eliminar una cita que ya fue atendida')
  }

  await getPool().query(
    `INSERT INTO deletion_logs
       (entity_type, entity_id, entity_label, entity_data, reason, deleted_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      'appointments',
      id,
      `Cita #${id} — ${appt.client_name} (${appt.motorcycle_plate}) ${appt.requested_date}`,
      JSON.stringify(appt),
      reason.trim(),
      deletedById,
    ]
  )

  await AppointmentModel.remove(id)
}

// ── Transiciones de estado ───────────────────────────────────
export async function confirm(id, userId) {
  const appt = await getById(id)

  const allowed = ['Pendiente', 'Reprogramada']
  if (!allowed.includes(appt.status)) {
    throw ApiError.conflict(
      `Solo se puede confirmar una cita en estado ${allowed.join(' o ')}. ` +
      `Estado actual: "${appt.status}"`
    )
  }

  return AppointmentModel.update(id, { status: 'Confirmada' })
}

export async function cancel(id, userId, reason) {
  const appt = await getById(id)

  const blocked = ['Atendida', 'Cancelada']
  if (blocked.includes(appt.status)) {
    throw ApiError.conflict(
      `No se puede cancelar una cita con estado "${appt.status}"`
    )
  }

  return AppointmentModel.update(id, { status: 'Cancelada' })
}

export async function reschedule(id, userId, { new_date, new_time, reason, notes }) {
  const appt = await getById(id)

  const allowed = ['Pendiente', 'Confirmada', 'Reprogramada']
  if (!allowed.includes(appt.status)) {
    throw ApiError.conflict(
      `Solo se puede reprogramar una cita en estado ${allowed.join(', ')}. ` +
      `Estado actual: "${appt.status}"`
    )
  }

  _assertFutureDateTime(new_date, new_time)
  _assertBusinessHours(new_date, new_time)

  // No tiene sentido reprogramar a la misma fecha y hora
  const sameDate = appt.requested_date === new_date
  const sameTime = String(appt.requested_time).slice(0, 5) === new_time
  if (sameDate && sameTime) {
    throw ApiError.badRequest(
      'La nueva fecha y hora deben ser distintas a las actuales'
    )
  }

  await AppointmentModel.createReschedule({
    appointment_id: id,
    original_date:  appt.requested_date,
    original_time:  String(appt.requested_time).slice(0, 5),
    new_date,
    new_time,
    reason:         reason.trim(),
    notes:          notes ?? null,
    rescheduled_by: userId,
  })

  return AppointmentModel.findById(id)
}

export async function attend(id) {
  const appt = await getById(id)

  if (appt.status === 'Atendida') return appt

  if (appt.status === 'Cancelada') {
    throw ApiError.conflict('No se puede marcar como atendida una cita cancelada')
  }

  return AppointmentModel.update(id, { status: 'Atendida' })
}

// ── Validaciones de horario de taller ───────────────────────
function _assertFutureDateTime(dateStr, timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  const apptMs = new Date(`${dateStr}T${timeStr}:00`).getTime()
  const nowMs  = Date.now()

  if (isNaN(apptMs)) {
    throw ApiError.badRequest('Fecha u hora de cita inválida')
  }
  // Mínimo 30 minutos en el futuro
  if (apptMs < nowMs + 30 * 60 * 1000) {
    throw ApiError.badRequest(
      'La cita debe agendarse con al menos 30 minutos de anticipación'
    )
  }
}

function _assertBusinessHours(dateStr, timeStr) {
  const dow = new Date(`${dateStr}T12:00:00`).getDay() // 0=Dom

  if (dow === 0) {
    throw ApiError.badRequest('El taller no atiende los domingos')
  }

  const [h, m] = timeStr.split(':').map(Number)
  const minutes  = h * 60 + m
  const open     = 8 * 60
  const close    = dow === 6 ? 15 * 60 : 18 * 60

  if (minutes < open || minutes >= close) {
    if (dow === 6) {
      throw ApiError.badRequest('Los sábados el taller atiende de 08:00 a 15:00')
    }
    throw ApiError.badRequest('El taller atiende de lunes a viernes de 08:00 a 18:00')
  }
}

// ── FK helpers ───────────────────────────────────────────────
async function _assertClientExists(id) {
  const [rows] = await getPool().query(
    'SELECT id FROM clients WHERE id = ? AND deleted_at IS NULL', [id]
  )
  if (!rows.length) throw ApiError.notFound(`Cliente con ID ${id} no encontrado`)
}

async function _assertMotorcycleExists(id) {
  const [rows] = await getPool().query(
    'SELECT id FROM motorcycles WHERE id = ? AND deleted_at IS NULL', [id]
  )
  if (!rows.length) throw ApiError.notFound(`Motocicleta con ID ${id} no encontrada`)
}

async function _assertEmployeeExists(id) {
  const [rows] = await getPool().query(
    `SELECT id FROM employees WHERE id = ? AND deleted_at IS NULL
     AND status IN ('Activo', 'Vacaciones')`,
    [id]
  )
  if (!rows.length) throw ApiError.notFound(`Empleado con ID ${id} no encontrado o inactivo`)
}

import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import * as AppointmentService from '../services/appointments.service.js'

export async function getAll(req, res, next) {
  try {
    const { search, status, date, client_id, motorcycle_id, sort, page, limit } = req.query
    const result = await AppointmentService.getAll({
      search, status, date, client_id, motorcycle_id, sort, page, limit,
    })
    ApiResponse.paginated(res, result.data, result)
  } catch (err) {
    next(err)
  }
}

export async function getToday(_req, res, next) {
  try {
    const appointments = await AppointmentService.getToday()
    ApiResponse.success(res, appointments)
  } catch (err) {
    next(err)
  }
}

export async function getById(req, res, next) {
  try {
    const appt = await AppointmentService.getById(Number(req.params.id))
    ApiResponse.success(res, appt)
  } catch (err) {
    next(err)
  }
}

export async function getHistory(req, res, next) {
  try {
    const history = await AppointmentService.getHistory(Number(req.params.id))
    ApiResponse.success(res, history)
  } catch (err) {
    next(err)
  }
}

// POST /api/appointments — ruta pública (sin req.user)
export async function create(req, res, next) {
  try {
    const appt = await AppointmentService.create(req.body)
    ApiResponse.created(res, appt, 'Cita agendada exitosamente')
  } catch (err) {
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const appt = await AppointmentService.update(Number(req.params.id), req.body)
    ApiResponse.success(res, appt, 'Cita actualizada correctamente')
  } catch (err) {
    next(err)
  }
}

export async function remove(req, res, next) {
  try {
    const { reason } = req.body
    if (!reason?.trim()) {
      return next(ApiError.badRequest('El motivo de eliminación es requerido'))
    }
    await AppointmentService.remove(Number(req.params.id), req.user.id, reason)
    ApiResponse.noContent(res)
  } catch (err) {
    next(err)
  }
}

// ── Transiciones de estado ────────────────────────────────────
export async function confirm(req, res, next) {
  try {
    const appt = await AppointmentService.confirm(Number(req.params.id), req.user.id)
    ApiResponse.success(res, appt, 'Cita confirmada correctamente')
  } catch (err) {
    next(err)
  }
}

export async function cancel(req, res, next) {
  try {
    const { reason } = req.body
    const appt = await AppointmentService.cancel(
      Number(req.params.id), req.user.id, reason
    )
    ApiResponse.success(res, appt, 'Cita cancelada correctamente')
  } catch (err) {
    next(err)
  }
}

export async function reschedule(req, res, next) {
  try {
    const { new_date, new_time, reason, notes } = req.body
    const appt = await AppointmentService.reschedule(
      Number(req.params.id),
      req.user.id,
      { new_date, new_time, reason, notes }
    )
    ApiResponse.success(res, appt, 'Cita reprogramada correctamente')
  } catch (err) {
    next(err)
  }
}

export async function attend(req, res, next) {
  try {
    const appt = await AppointmentService.attend(Number(req.params.id))
    ApiResponse.success(res, appt, 'Cita marcada como atendida')
  } catch (err) {
    next(err)
  }
}

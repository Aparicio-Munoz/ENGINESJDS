import { Router } from 'express'
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import {
  createAppointmentRules,
  updateAppointmentRules,
  rescheduleRules,
  cancelRules,
} from '../validations/appointment.validation.js'
import * as AppointmentController from '../controllers/appointments.controller.js'

const router = Router()

// ── Ruta pública — clientes agendan desde la landing ─────────
// POST /api/appointments
router.post(
  '/',
  createAppointmentRules,
  validate,
  AppointmentController.create
)

// ── Todo lo siguiente requiere JWT ───────────────────────────
router.use(verifyToken)

// ── Rutas estáticas (ANTES de /:id) ──────────────────────────

// GET /api/appointments/today
//   Usa la vista v_todays_appointments — citas Pendientes/Confirmadas de hoy
router.get('/today', AppointmentController.getToday)

// ── Listado principal ─────────────────────────────────────────

// GET /api/appointments
//   ?search=       client_name, client_phone, motorcycle_plate, service_type
//   ?status=       Pendiente | Confirmada | Atendida | Cancelada | Reprogramada
//   ?date=         YYYY-MM-DD (día exacto)
//   ?client_id=    filtro por cliente registrado
//   ?motorcycle_id= filtro por moto registrada
//   ?sort=         date | date_desc | status | created_at
//   ?page= ?limit=
router.get('/', AppointmentController.getAll)

// ── Detalle ───────────────────────────────────────────────────
// GET /api/appointments/:id
router.get('/:id', AppointmentController.getById)

// GET /api/appointments/:id/history
//   { appointment, reschedules, client, motorcycle }
router.get('/:id/history', AppointmentController.getHistory)

// ── Mutaciones ────────────────────────────────────────────────

// PUT /api/appointments/:id
//   Actualiza service_type, notes, assigned_employee_id, status
//   No usar para reprogramar (usar /reschedule)
router.put('/:id', updateAppointmentRules, validate, AppointmentController.update)

// DELETE /api/appointments/:id  [Administrador]  body: { reason }
router.delete('/:id', requireRole('Administrador'), AppointmentController.remove)

// ── Transiciones de estado ────────────────────────────────────

// POST /api/appointments/:id/confirm
//   Pendiente | Reprogramada → Confirmada
router.post('/:id/confirm', AppointmentController.confirm)

// POST /api/appointments/:id/cancel
//   Pendiente | Confirmada | Reprogramada → Cancelada
//   body: { reason? }
router.post('/:id/cancel', cancelRules, validate, AppointmentController.cancel)

// POST /api/appointments/:id/reschedule
//   Pendiente | Confirmada | Reprogramada → Reprogramada (con nueva fecha/hora)
//   body: { new_date, new_time, reason, notes? }
//   Registra en appointment_reschedules
router.post(
  '/:id/reschedule',
  rescheduleRules,
  validate,
  AppointmentController.reschedule
)

// POST /api/appointments/:id/attend
//   Pendiente | Confirmada | Reprogramada → Atendida
//   Usado al crear una OT desde una cita
router.post('/:id/attend', AppointmentController.attend)

export default router

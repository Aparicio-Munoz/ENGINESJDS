import { body } from 'express-validator'

const VALID_STATUS  = ['Pendiente', 'Confirmada', 'Atendida', 'Cancelada', 'Reprogramada']
const TIME_REGEX    = /^([01]\d|2[0-3]):([0-5]\d)$/

// Verifica que la fecha no sea del pasado (validación rápida en capa HTTP)
function futureDateValidator(val) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(`${val}T00:00:00`)
  if (d < today) throw new Error('La fecha no puede ser en el pasado')
  return true
}

// ── POST /api/appointments (ruta pública) ─────────────────────
export const createAppointmentRules = [
  body('client_name')
    .trim()
    .notEmpty().withMessage('El nombre del cliente es requerido')
    .isLength({ max: 120 }).withMessage('Máximo 120 caracteres'),
  body('client_phone')
    .trim()
    .notEmpty().withMessage('El teléfono del cliente es requerido')
    .isMobilePhone('es-CO').withMessage('Teléfono colombiano inválido'),
  body('client_email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Correo electrónico inválido')
    .normalizeEmail(),
  body('motorcycle_plate')
    .trim()
    .notEmpty().withMessage('La placa es requerida')
    .toUpperCase()
    .isLength({ max: 10 }).withMessage('Máximo 10 caracteres'),
  body('service_type')
    .trim()
    .notEmpty().withMessage('El tipo de servicio es requerido')
    .isLength({ max: 120 }).withMessage('Máximo 120 caracteres'),
  body('requested_date')
    .isDate({ format: 'YYYY-MM-DD' }).withMessage('Fecha inválida (YYYY-MM-DD)')
    .custom(futureDateValidator),
  body('requested_time')
    .matches(TIME_REGEX).withMessage('Hora inválida (HH:MM)'),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Máximo 500 caracteres'),
  // Campos opcionales para clientes registrados
  body('client_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 }).withMessage('client_id inválido'),
  body('motorcycle_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 }).withMessage('motorcycle_id inválido'),
  body('assigned_employee_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 }).withMessage('assigned_employee_id inválido'),
]

// ── PUT /api/appointments/:id ─────────────────────────────────
export const updateAppointmentRules = [
  body('service_type')
    .optional()
    .trim()
    .notEmpty().withMessage('El servicio no puede estar vacío')
    .isLength({ max: 120 }).withMessage('Máximo 120 caracteres'),
  body('requested_date')
    .optional()
    .isDate({ format: 'YYYY-MM-DD' }).withMessage('Fecha inválida (YYYY-MM-DD)')
    .custom(futureDateValidator),
  body('requested_time')
    .optional()
    .matches(TIME_REGEX).withMessage('Hora inválida (HH:MM)'),
  body('status')
    .optional()
    .isIn(VALID_STATUS)
    .withMessage(`Estado inválido — debe ser: ${VALID_STATUS.join(', ')}`),
  body('assigned_employee_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 }).withMessage('assigned_employee_id inválido'),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Máximo 500 caracteres'),
]

// ── POST /api/appointments/:id/reschedule ─────────────────────
export const rescheduleRules = [
  body('new_date')
    .notEmpty().withMessage('La nueva fecha es requerida')
    .isDate({ format: 'YYYY-MM-DD' }).withMessage('Fecha inválida (YYYY-MM-DD)')
    .custom(futureDateValidator),
  body('new_time')
    .notEmpty().withMessage('La nueva hora es requerida')
    .matches(TIME_REGEX).withMessage('Hora inválida (HH:MM)'),
  body('reason')
    .trim()
    .notEmpty().withMessage('El motivo de reprogramación es requerido')
    .isLength({ max: 500 }).withMessage('Máximo 500 caracteres'),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Máximo 500 caracteres'),
]

// ── POST /api/appointments/:id/cancel ────────────────────────
export const cancelRules = [
  body('reason')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Máximo 500 caracteres'),
]

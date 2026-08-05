import { body } from 'express-validator'

const VALID_STATUS  = ['Pendiente', 'En proceso', 'En reparación', 'Esperando repuesto', 'Listo', 'Lista para entrega', 'Entregada']
const VALID_PAYMENT = ['Efectivo', 'Transferencia', 'Tarjeta', 'Nequi', 'Daviplata', 'Otro']

// ── POST /api/orders ─────────────────────────────────────────
export const createOrderRules = [
  body('client_id')
    .isInt({ min: 1 }).withMessage('client_id es requerido y debe ser un entero positivo'),
  body('motorcycle_id')
    .isInt({ min: 1 }).withMessage('motorcycle_id es requerido y debe ser un entero positivo'),
  body('problem_description')
    .trim()
    .notEmpty().withMessage('La descripción del problema es requerida')
    .isLength({ max: 2000 }).withMessage('Máximo 2000 caracteres'),
  body('assigned_employee_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 }).withMessage('assigned_employee_id inválido'),
  body('appointment_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 }).withMessage('appointment_id inválido'),
  body('labor_cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('labor_cost debe ser >= 0'),
  body('discount')
    .optional()
    .isFloat({ min: 0 }).withMessage('discount debe ser >= 0'),
]

// ── PUT /api/orders/:id ──────────────────────────────────────
export const updateOrderRules = [
  body('assigned_employee_id')
    .optional({ nullable: true })
    .if((val) => val !== null)
    .isInt({ min: 1 }).withMessage('assigned_employee_id inválido'),
  body('diagnostic_notes')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Máximo 2000 caracteres'),
  body('work_notes')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Máximo 2000 caracteres'),
  body('labor_cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('labor_cost debe ser >= 0'),
  body('discount')
    .optional()
    .isFloat({ min: 0 }).withMessage('discount debe ser >= 0'),
]

// ── POST /api/orders/:id/change-status ───────────────────────
export const changeStatusRules = [
  body('status')
    .isIn(VALID_STATUS)
    .withMessage(`Estado inválido — valores válidos: ${VALID_STATUS.join(', ')}`),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Máximo 500 caracteres'),
]

// ── POST /api/orders/:id/add-service ─────────────────────────
export const addServiceRules = [
  body('service_catalog_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 }).withMessage('service_catalog_id inválido'),
  body('service_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 120 }).withMessage('Máximo 120 caracteres'),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Máximo 500 caracteres'),
  body('quantity')
    .optional()
    .isInt({ min: 1 }).withMessage('quantity debe ser un entero >= 1'),
  body('unit_price')
    .optional()
    .isFloat({ min: 0 }).withMessage('unit_price debe ser >= 0'),
  body('employee_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 }).withMessage('employee_id inválido'),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Máximo 500 caracteres'),
]

// ── POST /api/orders/:id/add-part ────────────────────────────
export const addPartRules = [
  body('inventory_id')
    .isInt({ min: 1 }).withMessage('inventory_id es requerido'),
  body('quantity')
    .isInt({ min: 1 }).withMessage('quantity debe ser un entero >= 1'),
]

// ── POST /api/orders/:id/close ───────────────────────────────
export const closeRules = [
  body('payment_method')
    .optional({ checkFalsy: true })
    .isIn(VALID_PAYMENT)
    .withMessage(`payment_method inválido — válidos: ${VALID_PAYMENT.join(', ')}`),
  body('payment_status')
    .optional()
    .isIn(['Pagado', 'Pendiente', 'Parcial'])
    .withMessage('payment_status debe ser Pagado, Pendiente o Parcial'),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Máximo 500 caracteres'),
]

// ── DELETE /api/orders/:id ───────────────────────────────────
export const deleteOrderRules = [
  body('reason')
    .trim()
    .notEmpty().withMessage('El motivo de eliminación es requerido')
    .isLength({ max: 500 }).withMessage('Máximo 500 caracteres'),
]

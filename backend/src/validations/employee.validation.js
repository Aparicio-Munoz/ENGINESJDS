import { body } from 'express-validator'

const DOCUMENT_TYPES = ['CC', 'CE', 'Pasaporte']
const VALID_STATUS   = ['Activo', 'Inactivo', 'Vacaciones', 'Incapacidad', 'Suspendido', 'Retirado']

// ── Reglas activas para POST ──────────────────────────────────
const sharedRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ max: 100 }).withMessage('Máximo 100 caracteres'),
  body('last_name')
    .trim()
    .notEmpty().withMessage('El apellido es requerido')
    .isLength({ max: 100 }).withMessage('Máximo 100 caracteres'),
  body('specialty')
    .trim()
    .notEmpty().withMessage('La especialidad es requerida')
    .isLength({ max: 80 }).withMessage('Máximo 80 caracteres'),
  body('phone')
    .trim()
    .notEmpty().withMessage('El teléfono es requerido')
    .isMobilePhone('es-CO').withMessage('Ingresa un teléfono colombiano válido'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Correo electrónico inválido')
    .normalizeEmail(),
  body('daily_rate')
    .optional()
    .isFloat({ min: 0 }).withMessage('La tarifa diaria debe ser un número mayor o igual a 0'),
  body('status')
    .optional()
    .isIn(VALID_STATUS)
    .withMessage(`Estado inválido — debe ser: ${VALID_STATUS.join(', ')}`),
  body('hire_date')
    .optional({ checkFalsy: true })
    .isDate({ format: 'YYYY-MM-DD' }).withMessage('Fecha de contratación inválida (YYYY-MM-DD)'),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Máximo 1000 caracteres'),
]

// ── Reglas opcionales para PUT (si el campo llega, se valida) ─
const sharedOptional = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('El nombre no puede estar vacío')
    .isLength({ max: 100 }).withMessage('Máximo 100 caracteres'),
  body('last_name')
    .optional()
    .trim()
    .notEmpty().withMessage('El apellido no puede estar vacío')
    .isLength({ max: 100 }).withMessage('Máximo 100 caracteres'),
  body('specialty')
    .optional()
    .trim()
    .notEmpty().withMessage('La especialidad no puede estar vacía')
    .isLength({ max: 80 }).withMessage('Máximo 80 caracteres'),
  body('phone')
    .optional()
    .trim()
    .notEmpty().withMessage('El teléfono no puede estar vacío')
    .isMobilePhone('es-CO').withMessage('Ingresa un teléfono colombiano válido'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Correo electrónico inválido')
    .normalizeEmail(),
  body('daily_rate')
    .optional()
    .isFloat({ min: 0 }).withMessage('La tarifa diaria debe ser un número mayor o igual a 0'),
  body('status')
    .optional()
    .isIn(VALID_STATUS)
    .withMessage(`Estado inválido — debe ser: ${VALID_STATUS.join(', ')}`),
  body('hire_date')
    .optional({ checkFalsy: true })
    .isDate({ format: 'YYYY-MM-DD' }).withMessage('Fecha de contratación inválida (YYYY-MM-DD)'),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Máximo 1000 caracteres'),
]

export const createEmployeeRules = [
  body('document_type')
    .isIn(DOCUMENT_TYPES)
    .withMessage(`Tipo de documento inválido — debe ser: ${DOCUMENT_TYPES.join(', ')}`),
  body('document')
    .trim()
    .notEmpty().withMessage('El documento es requerido')
    .isLength({ min: 5, max: 20 }).withMessage('Entre 5 y 20 caracteres'),
  body('hire_date')
    .notEmpty().withMessage('La fecha de contratación es requerida')
    .isDate({ format: 'YYYY-MM-DD' }).withMessage('Formato inválido (YYYY-MM-DD)'),
  ...sharedRules,
]

export const updateEmployeeRules = [
  body('document_type')
    .optional()
    .isIn(DOCUMENT_TYPES)
    .withMessage(`Tipo de documento inválido — debe ser: ${DOCUMENT_TYPES.join(', ')}`),
  body('document')
    .optional()
    .trim()
    .notEmpty().withMessage('El documento no puede estar vacío')
    .isLength({ min: 5, max: 20 }).withMessage('Entre 5 y 20 caracteres'),
  ...sharedOptional,
]

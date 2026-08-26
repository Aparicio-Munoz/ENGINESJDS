import { body } from 'express-validator'

// Placa colombiana: 3 letras + 3 dígitos (ABC123) o 3 letras + 2 dígitos + 1 letra/dígito (ABC12D)
const PLATE_REGEX = /^[A-Z]{3}[0-9]{2}[A-Z0-9]$/

const VALID_STATUS = ['En servicio', 'En reparación', 'Lista para entrega', 'Entregada']
const MAX_YEAR     = new Date().getFullYear() + 1

// ── Reglas activas para POST (campos opcionales: se validan solo si llegan con dato) ──
const sharedRules = [
  body('brand')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 60 }).withMessage('Máximo 60 caracteres'),
  body('model')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 80 }).withMessage('Máximo 80 caracteres'),
  body('year')
    .optional({ checkFalsy: true })
    .isInt({ min: 1970, max: MAX_YEAR })
    .withMessage(`El año debe estar entre 1970 y ${MAX_YEAR}`),
  body('engine_cc')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 9999 }).withMessage('Cilindrada inválida (1–9999 cc)'),
  body('status')
    .optional()
    .isIn(VALID_STATUS)
    .withMessage(`Estado inválido — debe ser: ${VALID_STATUS.join(', ')}`),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Máximo 1000 caracteres'),
]

// ── Reglas opcionales para PUT (vacío/omitido pasa — el service lo
// normaliza a NULL, igual que en creación, para poder "borrar" un campo
// opcional al editar) ──────────────────────────────────────────
const sharedOptional = [
  body('brand')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 60 }).withMessage('Máximo 60 caracteres'),
  body('model')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 80 }).withMessage('Máximo 80 caracteres'),
  body('year')
    .optional({ checkFalsy: true })
    .isInt({ min: 1970, max: MAX_YEAR })
    .withMessage(`El año debe estar entre 1970 y ${MAX_YEAR}`),
  body('engine_cc')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 9999 }).withMessage('Cilindrada inválida (1–9999 cc)'),
  body('status')
    .optional()
    .isIn(VALID_STATUS)
    .withMessage(`Estado inválido — debe ser: ${VALID_STATUS.join(', ')}`),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Máximo 1000 caracteres'),
  body('client_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 }).withMessage('client_id debe ser un entero positivo'),
]

export const createMotorcycleRules = [
  body('client_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 }).withMessage('client_id debe ser un entero positivo'),
  body('plate')
    .optional({ checkFalsy: true })
    .trim()
    .toUpperCase()
    .matches(PLATE_REGEX)
    .withMessage('Formato de placa colombiana inválido (ej: ABC123 o ABC12D)'),
  ...sharedRules,
]

export const updateMotorcycleRules = [
  body('plate')
    .optional({ checkFalsy: true })
    .trim()
    .toUpperCase()
    .matches(PLATE_REGEX)
    .withMessage('Formato de placa colombiana inválido (ej: ABC123 o ABC12D)'),
  ...sharedOptional,
]

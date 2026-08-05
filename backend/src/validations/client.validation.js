import { body } from 'express-validator'

const DOCUMENT_TYPES = ['CC', 'CE', 'NIT', 'Pasaporte']
const VALID_STATUS   = ['Activo', 'Inactivo']

// ── Reglas compartidas (con validación activa)
const sharedRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ max: 100 }).withMessage('Máximo 100 caracteres'),
  body('last_name')
    .trim()
    .notEmpty().withMessage('El apellido es requerido')
    .isLength({ max: 100 }).withMessage('Máximo 100 caracteres'),
  body('phone')
    .trim()
    .notEmpty().withMessage('El teléfono es requerido')
    .isMobilePhone('es-CO').withMessage('Ingresa un teléfono colombiano válido'),
  body('city')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 80 }).withMessage('Máximo 80 caracteres'),
  body('status')
    .optional()
    .isIn(VALID_STATUS).withMessage(`Estado inválido — debe ser: ${VALID_STATUS.join(', ')}`),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Máximo 1000 caracteres'),
]

// ── Reglas compartidas opcionales (para PUT: si el campo llega, se valida)
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
  body('phone')
    .optional()
    .trim()
    .notEmpty().withMessage('El teléfono no puede estar vacío')
    .isMobilePhone('es-CO').withMessage('Ingresa un teléfono colombiano válido'),
  body('city')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 80 }).withMessage('Máximo 80 caracteres'),
  body('status')
    .optional()
    .isIn(VALID_STATUS).withMessage(`Estado inválido — debe ser: ${VALID_STATUS.join(', ')}`),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Máximo 1000 caracteres'),
]

export const createClientRules = [
  body('document_type')
    .isIn(DOCUMENT_TYPES)
    .withMessage(`Tipo de documento inválido — debe ser: ${DOCUMENT_TYPES.join(', ')}`),
  body('document')
    .trim()
    .notEmpty().withMessage('El documento es requerido')
    .isLength({ min: 5, max: 20 }).withMessage('Entre 5 y 20 caracteres'),
  ...sharedRules,
]

export const updateClientRules = [
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

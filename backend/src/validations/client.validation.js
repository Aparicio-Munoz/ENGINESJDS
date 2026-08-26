import { body } from 'express-validator'

const DOCUMENT_TYPES = ['CC', 'CE', 'NIT', 'Pasaporte']
const VALID_STATUS   = ['Activo', 'Inactivo']

// ── Reglas compartidas (campos opcionales: se validan solo si llegan con dato)
const sharedRules = [
  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Máximo 100 caracteres'),
  body('last_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Máximo 100 caracteres'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
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

// ── Reglas compartidas opcionales (para PUT: si el campo llega con dato se
// valida; vacío/omitido se deja pasar — el service lo normaliza a NULL,
// igual que en creación, para poder "borrar" un campo opcional al editar)
const sharedOptional = [
  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Máximo 100 caracteres'),
  body('last_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Máximo 100 caracteres'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
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
    .optional({ checkFalsy: true })
    .isIn(DOCUMENT_TYPES)
    .withMessage(`Tipo de documento inválido — debe ser: ${DOCUMENT_TYPES.join(', ')}`),
  body('document')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 5, max: 20 }).withMessage('Entre 5 y 20 caracteres'),
  ...sharedRules,
]

export const updateClientRules = [
  body('document_type')
    .optional({ checkFalsy: true })
    .isIn(DOCUMENT_TYPES)
    .withMessage(`Tipo de documento inválido — debe ser: ${DOCUMENT_TYPES.join(', ')}`),
  body('document')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 5, max: 20 }).withMessage('Entre 5 y 20 caracteres'),
  ...sharedOptional,
]

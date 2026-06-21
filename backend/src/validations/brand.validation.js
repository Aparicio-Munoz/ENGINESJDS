import { body } from 'express-validator'

const CATEGORIES = [
  'Aceites', 'Filtros', 'Llantas', 'Baterías',
  'Pastillas', 'Accesorios', 'Lubricantes', 'Eléctricos',
]

export const createBrandRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre de la marca es requerido')
    .isLength({ max: 100 }).withMessage('Máximo 100 caracteres'),
  body('category')
    .isIn(CATEGORIES)
    .withMessage(`Categoría inválida — debe ser: ${CATEGORIES.join(', ')}`),
  body('price')
    .notEmpty().withMessage('El precio es requerido')
    .isFloat({ gt: 0 }).withMessage('El precio debe ser mayor a 0'),
  body('status')
    .optional()
    .isIn(['Activo', 'Inactivo']).withMessage('Estado debe ser Activo o Inactivo'),
]

export const updateBrandRules = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('El nombre no puede estar vacío')
    .isLength({ max: 100 }).withMessage('Máximo 100 caracteres'),
  body('category')
    .optional()
    .isIn(CATEGORIES)
    .withMessage(`Categoría inválida — debe ser: ${CATEGORIES.join(', ')}`),
  body('price')
    .optional()
    .isFloat({ gt: 0 }).withMessage('El precio debe ser mayor a 0'),
  body('status')
    .optional()
    .isIn(['Activo', 'Inactivo']).withMessage('Estado debe ser Activo o Inactivo'),
]

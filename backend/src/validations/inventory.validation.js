import { body } from 'express-validator'

const CATEGORIES = [
  'Aceites', 'Filtros', 'Llantas', 'Frenos',
  'Transmisión', 'Eléctricos', 'Accesorios',
]

// ── Reglas activas para POST ──────────────────────────────────
const sharedRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ max: 120 }).withMessage('Máximo 120 caracteres'),
  body('brand')
    .trim()
    .notEmpty().withMessage('La marca es requerida')
    .isLength({ max: 60 }).withMessage('Máximo 60 caracteres'),
  body('category')
    .isIn(CATEGORIES)
    .withMessage(`Categoría inválida — debe ser: ${CATEGORIES.join(', ')}`),
  body('unit_price')
    .isFloat({ min: 0 }).withMessage('El precio de compra debe ser mayor o igual a 0'),
  body('sale_price')
    .isFloat({ min: 0 }).withMessage('El precio de venta debe ser mayor o igual a 0')
    .custom((value, { req }) => {
      const unitPrice = parseFloat(req.body.unit_price)
      if (!isNaN(unitPrice) && parseFloat(value) < unitPrice) {
        throw new Error('El precio de venta debe ser mayor o igual al precio de compra')
      }
      return true
    }),
  body('quantity')
    .isInt({ min: 0 }).withMessage('La cantidad debe ser un entero mayor o igual a 0'),
  body('min_stock')
    .isInt({ min: 0 }).withMessage('El stock mínimo debe ser un entero mayor o igual a 0'),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Máximo 1000 caracteres'),
  body('unit')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 }).withMessage('Máximo 20 caracteres'),
  body('supplier')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 120 }).withMessage('Máximo 120 caracteres'),
  body('image_url')
    .optional({ checkFalsy: true })
    .isURL().withMessage('URL de imagen inválida'),
]

// ── Reglas opcionales para PUT ────────────────────────────────
const sharedOptional = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('El nombre no puede estar vacío')
    .isLength({ max: 120 }).withMessage('Máximo 120 caracteres'),
  body('brand')
    .optional()
    .trim()
    .notEmpty().withMessage('La marca no puede estar vacía')
    .isLength({ max: 60 }).withMessage('Máximo 60 caracteres'),
  body('category')
    .optional()
    .isIn(CATEGORIES)
    .withMessage(`Categoría inválida — debe ser: ${CATEGORIES.join(', ')}`),
  body('unit_price')
    .optional()
    .isFloat({ min: 0 }).withMessage('El precio de compra debe ser mayor o igual a 0'),
  body('sale_price')
    .optional()
    .isFloat({ min: 0 }).withMessage('El precio de venta debe ser mayor o igual a 0'),
  body('quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('La cantidad debe ser un entero mayor o igual a 0'),
  body('min_stock')
    .optional()
    .isInt({ min: 0 }).withMessage('El stock mínimo debe ser un entero mayor o igual a 0'),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Máximo 1000 caracteres'),
  body('unit')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 }).withMessage('Máximo 20 caracteres'),
  body('supplier')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 120 }).withMessage('Máximo 120 caracteres'),
  body('image_url')
    .optional({ checkFalsy: true })
    .isURL().withMessage('URL de imagen inválida'),
]

export const createInventoryRules = [
  body('code')
    .trim()
    .notEmpty().withMessage('El código es requerido')
    .toUpperCase()
    .matches(/^[A-Z0-9-]{3,20}$/)
    .withMessage('Código inválido — 3 a 20 caracteres alfanuméricos o guiones'),
  ...sharedRules,
]

export const updateInventoryRules = [
  body('code')
    .optional()
    .trim()
    .toUpperCase()
    .matches(/^[A-Z0-9-]{3,20}$/)
    .withMessage('Código inválido — 3 a 20 caracteres alfanuméricos o guiones'),
  ...sharedOptional,
]

// ── Movimientos manuales ──────────────────────────────────────
export const entryRules = [
  body('qty')
    .isInt({ min: 1 }).withMessage('La cantidad debe ser un entero positivo'),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Máximo 500 caracteres'),
]

export const outputRules = [
  body('qty')
    .isInt({ min: 1 }).withMessage('La cantidad debe ser un entero positivo'),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Máximo 500 caracteres'),
]

export const adjustmentRules = [
  body('quantity')
    .isInt({ min: 0 }).withMessage('La nueva cantidad debe ser un entero mayor o igual a 0'),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Máximo 500 caracteres'),
]

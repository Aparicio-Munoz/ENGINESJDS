import { body } from 'express-validator'

export const createQuickJobRules = [
  body('description')
    .trim()
    .notEmpty().withMessage('La descripción del trabajo es requerida')
    .isLength({ max: 200 }).withMessage('Máximo 200 caracteres'),
  body('price')
    .isFloat({ min: 0 }).withMessage('El precio debe ser mayor o igual a 0'),
  body('employee_id')
    .isInt({ min: 1 }).withMessage('Selecciona el empleado que hizo el trabajo'),
]

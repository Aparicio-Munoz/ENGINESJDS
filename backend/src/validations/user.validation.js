import { body } from 'express-validator'

const VALID_ROLES = ['Administrador', 'Técnico', 'Recepcionista']

export const createUserRules = [
  body('username')
    .trim()
    .notEmpty().withMessage('El nombre de usuario es requerido')
    .isLength({ min: 3, max: 50 }).withMessage('El usuario debe tener entre 3 y 50 caracteres'),
  body('email')
    .isEmail().withMessage('Correo electrónico inválido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('role')
    .isIn(VALID_ROLES).withMessage(`Rol inválido — debe ser: ${VALID_ROLES.join(', ')}`),
  body('status')
    .optional()
    .isIn(['Activo', 'Inactivo']).withMessage('Estado inválido'),
]

export const updateUserRules = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('El usuario debe tener entre 3 y 50 caracteres'),
  body('email')
    .optional()
    .isEmail().withMessage('Correo electrónico inválido')
    .normalizeEmail(),
  body('role')
    .optional()
    .isIn(VALID_ROLES).withMessage(`Rol inválido — debe ser: ${VALID_ROLES.join(', ')}`),
  body('status')
    .optional()
    .isIn(['Activo', 'Inactivo']).withMessage('Estado inválido'),
]

export const resetPasswordRules = [
  body('password')
    .isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
]

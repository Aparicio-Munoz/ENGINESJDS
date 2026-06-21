import { body } from 'express-validator'

export const loginRules = [
  body('email')
    .isEmail().withMessage('Ingresa un correo electrónico válido')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contraseña es requerida'),
]

export const registerRules = [
  body('username')
    .trim()
    .notEmpty().withMessage('El nombre de usuario es requerido')
    .isLength({ min: 3, max: 50 }).withMessage('El usuario debe tener entre 3 y 50 caracteres'),
  body('email')
    .isEmail().withMessage('Ingresa un correo electrónico válido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('role')
    .optional()
    .isIn(['Administrador', 'Técnico', 'Recepcionista'])
    .withMessage('Rol inválido — debe ser Administrador, Técnico o Recepcionista'),
  body('status')
    .optional()
    .isIn(['Activo', 'Inactivo'])
    .withMessage('Estado inválido'),
]

export const changePasswordRules = [
  body('currentPassword')
    .notEmpty().withMessage('La contraseña actual es requerida'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Las contraseñas no coinciden'),
]

export const forgotPasswordRules = [
  body('email')
    .isEmail().withMessage('Ingresa un correo electrónico válido')
    .normalizeEmail(),
]

export const resetPasswordRules = [
  body('code')
    .notEmpty().withMessage('El código es requerido')
    .isLength({ min: 6, max: 6 }).withMessage('El código debe tener exactamente 6 dígitos')
    .isNumeric().withMessage('El código solo debe contener números'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
]

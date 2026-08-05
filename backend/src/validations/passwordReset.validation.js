import { body } from 'express-validator'

export const forgotPasswordRules = [
  body('email')
    .isEmail().withMessage('Ingresa un correo electrónico válido')
    .normalizeEmail(),
]

export const verifyCodeRules = [
  body('email')
    .isEmail().withMessage('Ingresa un correo electrónico válido')
    .normalizeEmail(),
  body('code')
    .trim()
    .notEmpty().withMessage('El código es requerido')
    .isLength({ min: 6, max: 6 }).withMessage('El código debe tener 6 dígitos')
    .isNumeric().withMessage('El código debe contener solo números'),
]

export const resetPasswordRules = [
  body('email')
    .isEmail().withMessage('Ingresa un correo electrónico válido')
    .normalizeEmail(),
  body('code')
    .trim()
    .notEmpty().withMessage('El código es requerido')
    .isLength({ min: 6, max: 6 }).withMessage('El código debe tener 6 dígitos')
    .isNumeric().withMessage('El código debe contener solo números'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/[A-Z]/).withMessage('La contraseña debe contener al menos una mayúscula')
    .matches(/[0-9]/).withMessage('La contraseña debe contener al menos un número'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Las contraseñas no coinciden'),
]

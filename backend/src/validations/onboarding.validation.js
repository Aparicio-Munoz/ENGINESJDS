import { body } from 'express-validator'

export const workshopRegistrationRules = [
  body('businessName')
    .trim()
    .notEmpty().withMessage('El nombre del taller es requerido')
    .isLength({ min: 3, max: 150 }).withMessage('El nombre del taller debe tener entre 3 y 150 caracteres'),
  body('username')
    .trim()
    .notEmpty().withMessage('El nombre de usuario es requerido')
    .isLength({ min: 3, max: 50 }).withMessage('El usuario debe tener entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9._-]+$/).withMessage('El usuario solo puede incluir letras, números, punto, guion y guion bajo'),
  body('email')
    .isEmail().withMessage('Ingresa un correo electrónico válido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/[A-Z]/).withMessage('La contraseña debe contener al menos una mayúscula')
    .matches(/[0-9]/).withMessage('La contraseña debe contener al menos un número'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Las contraseñas no coinciden'),
]

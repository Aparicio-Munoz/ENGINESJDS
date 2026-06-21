import { Router } from 'express'
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import {
  createUserRules,
  updateUserRules,
  resetPasswordRules,
} from '../validations/user.validation.js'
import * as UserController from '../controllers/users.controller.js'

const router = Router()

// Todos los endpoints de este módulo requieren sesión + rol Administrador
router.use(verifyToken, requireRole('Administrador'))

// GET    /api/users           → Listar usuarios (query: search, role, status)
router.get('/', UserController.getAll)

// GET    /api/users/:id       → Detalle de un usuario
router.get('/:id', UserController.getById)

// POST   /api/users           → Crear nuevo usuario
router.post('/', createUserRules, validate, UserController.create)

// PUT    /api/users/:id       → Actualizar username, email, rol, estado
router.put('/:id', updateUserRules, validate, UserController.update)

// PUT    /api/users/:id/reset-password → Restablecer contraseña (sin contraseña actual)
router.put('/:id/reset-password', resetPasswordRules, validate, UserController.resetPassword)

// DELETE /api/users/:id       → Eliminar usuario (body: { reason })
router.delete('/:id', UserController.remove)

export default router

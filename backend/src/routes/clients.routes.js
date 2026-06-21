import { Router } from 'express'
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { createClientRules, updateClientRules } from '../validations/client.validation.js'
import * as ClientController from '../controllers/clients.controller.js'

const router = Router()

// Todos los endpoints requieren sesión activa
router.use(verifyToken)

// GET  /api/clients
//   ?search=    busca en nombre, apellido, documento, teléfono, ciudad
//   ?status=    Activo | Inactivo
//   ?sort=      name | created_at  (default: created_at)
//   ?page=      número de página   (default: 1)
//   ?limit=     registros por página (default: 20)
router.get('/', ClientController.getAll)

// GET  /api/clients/:id
router.get('/:id', ClientController.getById)

// POST /api/clients
router.post('/', createClientRules, validate, ClientController.create)

// PUT  /api/clients/:id
router.put('/:id', updateClientRules, validate, ClientController.update)

// DELETE /api/clients/:id    body: { reason }
// Solo Administrador puede eliminar clientes (soft delete + deletion_log)
router.delete('/:id', requireRole('Administrador'), ClientController.remove)

export default router

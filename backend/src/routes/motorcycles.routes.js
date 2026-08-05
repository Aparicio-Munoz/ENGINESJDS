import { Router } from 'express'
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { createMotorcycleRules, updateMotorcycleRules } from '../validations/motorcycle.validation.js'
import * as MotorcycleController from '../controllers/motorcycles.controller.js'

const router = Router()

// Todos los endpoints requieren sesión activa
router.use(verifyToken)

// GET  /api/motorcycles
//   ?search=    busca en placa, marca, modelo, nombre del cliente
//   ?brand=     filtro exacto de marca
//   ?model=     filtro parcial de modelo
//   ?year=      filtro por año
//   ?status=    En servicio | Disponible | Lista para entrega
//   ?client_id= filtro por cliente
//   ?sort=      plate | brand | year | created_at  (default: created_at)
//   ?page=      número de página  (default: 1)
//   ?limit=     por página        (default: 20)
router.get('/', MotorcycleController.getAll)

// GET  /api/motorcycles/brands  → Lista de marcas únicas (para filtros)
// ⚠ Debe ir ANTES de /:id
router.get('/brands', MotorcycleController.getBrands)

// GET  /api/motorcycles/:id
router.get('/:id', MotorcycleController.getById)

// GET  /api/motorcycles/:id/history
//   Retorna: { motorcycle, client, appointments, orders, tecnomecanica }
router.get('/:id/history', MotorcycleController.getHistory)

// POST   /api/motorcycles
router.post(
  '/',
  createMotorcycleRules,
  validate,
  MotorcycleController.create
)

// PUT    /api/motorcycles/:id
router.put(
  '/:id',
  updateMotorcycleRules,
  validate,
  MotorcycleController.update
)

// DELETE /api/motorcycles/:id   [Administrador]   body: { reason }
router.delete(
  '/:id',
  requireRole('Administrador'),
  MotorcycleController.remove
)

export default router

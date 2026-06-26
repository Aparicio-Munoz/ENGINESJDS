import { Router } from 'express'
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import {
  createInventoryRules,
  updateInventoryRules,
  entryRules,
  outputRules,
  adjustmentRules,
} from '../validations/inventory.validation.js'
import * as InventoryController from '../controllers/inventory.controller.js'

const router = Router()

router.use(verifyToken)
router.use(requireRole('Administrador'))

// ── Rutas estáticas (ANTES de /:id) ──────────────────────────

// GET  /api/inventory/categories   → ['Aceites', 'Filtros', …]
router.get('/categories', InventoryController.getCategories)

// GET  /api/inventory/brands       → marcas únicas en BD
router.get('/brands', InventoryController.getBrands)

// GET  /api/inventory/alerts
//   ?status=   Agotado | Stock bajo   (opcional, sin filtro devuelve ambos)
//   Usa la vista v_inventory_alerts — incluye costo estimado de reabastecimiento
router.get('/alerts', InventoryController.getAlerts)

// ── Inventario principal ──────────────────────────────────────

// GET  /api/inventory
//   ?search=    nombre, código, marca, categoría
//   ?category=  Aceites | Filtros | Llantas | Frenos | Transmisión | Eléctricos | Accesorios
//   ?brand=     filtro exacto de marca
//   ?status=    Disponible | Stock bajo | Agotado
//   ?sort=      name | code | category | quantity | sold_count | created_at
//   ?page=      (default: 1)
//   ?limit=     (default: 20)
router.get('/', InventoryController.getAll)

// GET  /api/inventory/:id
router.get('/:id', InventoryController.getById)

// GET  /api/inventory/:id/movements
//   ?page=  ?limit=
router.get('/:id/movements', InventoryController.getMovements)

// POST /api/inventory
router.post('/', createInventoryRules, validate, InventoryController.create)

// PUT  /api/inventory/:id
router.put('/:id', updateInventoryRules, validate, InventoryController.update)

// DELETE /api/inventory/:id   body: { reason }
// Bloqueado si el repuesto tiene historial en órdenes
router.delete('/:id', InventoryController.remove)

// ── Movimientos manuales de stock ────────────────────────────

// POST /api/inventory/:id/entry   body: { qty: number, notes?: string }
router.post('/:id/entry', entryRules, validate, InventoryController.recordEntry)

// POST /api/inventory/:id/output   body: { qty: number, notes?: string }
router.post('/:id/output', outputRules, validate, InventoryController.recordOutput)

// POST /api/inventory/:id/adjustment   body: { quantity: number, notes?: string }
router.post('/:id/adjustment', adjustmentRules, validate, InventoryController.recordAdjustment)

export default router

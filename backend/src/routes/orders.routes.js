import { Router } from 'express'
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import {
  createOrderRules,
  updateOrderRules,
  changeStatusRules,
  addServiceRules,
  addPartRules,
  closeRules,
  deleteOrderRules,
} from '../validations/order.validation.js'
import * as OrderController from '../controllers/orders.controller.js'

const router = Router()
router.use(verifyToken)

// ── Rutas estáticas (ANTES de /:id para evitar captura como param) ──

// GET /api/orders/active
//   Órdenes que no están en estado Entregada
router.get('/active', OrderController.getActive)

// GET /api/orders/service-catalog
//   Lista servicios activos del catálogo para el formulario de add-service
router.get('/service-catalog', OrderController.getServiceCatalog)

// ── Listado y creación ─────────────────────────────────────────

// GET /api/orders
//   ?search=      order_number, client name, motorcycle plate
//   ?status=      Pendiente | En proceso | Listo | Entregada
//   ?employee_id= filtro por técnico asignado
//   ?client_id=   filtro por cliente
//   ?motorcycle_id= filtro por motocicleta
//   ?date_from=   YYYY-MM-DD
//   ?date_to=     YYYY-MM-DD
//   ?sort=        entry_date | entry_date_asc | status | final_price | created_at
//   ?page= ?limit=
router.get('/', OrderController.getAll)

// POST /api/orders
//   body: { client_id, motorcycle_id, problem_description,
//           assigned_employee_id?, appointment_id?,
//           estimated_delivery_date?, labor_cost?, discount? }
router.post('/', createOrderRules, validate, OrderController.create)

// ── Detalle e historial ───────────────────────────────────────

// GET /api/orders/:id
router.get('/:id', OrderController.getById)

// GET /api/orders/:id/history
//   { order, status_history, services, parts, sale }
router.get('/:id/history', OrderController.getHistory)

// ── Actualización principal ───────────────────────────────────

// PUT /api/orders/:id
//   body: { assigned_employee_id?, estimated_delivery_date?,
//           diagnostic_notes?, work_notes?, labor_cost?, discount? }
router.put('/:id', updateOrderRules, validate, OrderController.update)

// ── Transiciones de estado ────────────────────────────────────

// POST /api/orders/:id/change-status
//   body: { status, notes? }
//   No permite → Entregada (usar /close)
router.post('/:id/change-status', changeStatusRules, validate, OrderController.changeStatus)

// POST /api/orders/:id/close
//   Requiere: services registrados + técnico asignado
//   body: { payment_method?, payment_status?, notes? }
//   Marca la orden Entregada, vincula la cita como Atendida, crea/actualiza sales
router.post('/:id/close', closeRules, validate, OrderController.close)

// ── Servicios ─────────────────────────────────────────────────

// POST /api/orders/:id/add-service
//   body: { service_catalog_id?, service_name?, description?,
//           quantity?, unit_price?, employee_id?, notes? }
router.post('/:id/add-service', addServiceRules, validate, OrderController.addService)

// DELETE /api/orders/:id/services/:serviceId
router.delete('/:id/services/:serviceId', OrderController.removeService)

// ── Repuestos ─────────────────────────────────────────────────

// POST /api/orders/:id/add-part
//   body: { inventory_id, quantity }
//   El trigger descuenta stock, registra movimiento y actualiza parts_cost
router.post('/:id/add-part', addPartRules, validate, OrderController.addPart)

// DELETE /api/orders/:id/parts/:itemId
//   El trigger devuelve stock y actualiza parts_cost
router.delete('/:id/parts/:itemId', OrderController.removePart)

// ── Eliminación ───────────────────────────────────────────────

// DELETE /api/orders/:id  [Administrador]
//   body: { reason }  — no permite eliminar órdenes Entregadas
router.delete('/:id', requireRole('Administrador'), deleteOrderRules, validate, OrderController.remove)

export default router

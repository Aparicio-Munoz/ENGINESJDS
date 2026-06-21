import { Router } from 'express'
import { verifyToken, authorizeRoles } from '../middlewares/auth.middleware.js'
import * as TechController from '../controllers/technician.controller.js'

const router = Router()

router.use(verifyToken, authorizeRoles('Técnico'))

// GET  /api/technician/dashboard
router.get('/dashboard', TechController.getDashboard)

// GET  /api/technician/orders?search=&status=&sort=&page=&limit=
router.get('/orders', TechController.getOrders)

// PUT  /api/technician/orders/:id/status  { status, notes? }
router.put('/orders/:id/status', TechController.updateOrderStatus)

// PUT  /api/technician/orders/:id/notes   { work_notes }
router.put('/orders/:id/notes', TechController.updateOrderNotes)

// GET  /api/technician/motorcycles
router.get('/motorcycles', TechController.getMotorcycles)

// GET  /api/technician/part-requests?status=&page=&limit=
router.get('/part-requests', TechController.getPartRequests)

// POST /api/technician/part-requests  { order_id, part_name, quantity?, urgency?, notes? }
router.post('/part-requests', TechController.createPartRequest)

// GET  /api/technician/earnings
router.get('/earnings', TechController.getEarnings)

export default router

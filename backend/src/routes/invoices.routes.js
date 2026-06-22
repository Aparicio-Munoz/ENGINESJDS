import { Router } from 'express'
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import * as InvoiceController from '../controllers/invoice.controller.js'

const router = Router()
router.use(verifyToken, requireRole('Administrador'))

router.get('/daily-summary', InvoiceController.getDailySummary)
router.get('/',              InvoiceController.getAll)
router.get('/:id',           InvoiceController.getById)
router.get('/:id/pdf',       InvoiceController.getPDF)
router.post('/',             InvoiceController.create)
router.put('/:id/pay',      InvoiceController.markPaid)
router.put('/:id/cancel',   InvoiceController.cancel)

export default router

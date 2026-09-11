import { Router } from 'express'
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import * as BillingController from '../controllers/billing.controller.js'

const router = Router()

// Stripe llama este endpoint sin JWT; la firma del proveedor es la autenticación.
router.post('/webhook', BillingController.webhook)

router.use(verifyToken, requireRole('Administrador'))
router.get('/status', BillingController.getStatus)
router.post('/checkout', BillingController.createCheckout)

export default router

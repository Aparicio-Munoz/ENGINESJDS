import { Router } from 'express'
import * as TrackingController from '../controllers/tracking.controller.js'
import * as CatalogController from '../controllers/catalog.controller.js'
import * as PdfController from '../controllers/pdf.controller.js'
import { getPool } from '../config/database.js'
import { publicLimiter } from '../middlewares/rateLimit.middleware.js'
import { withPublicTenant } from '../middlewares/publicTenant.middleware.js'

const router = Router()

router.use(publicLimiter)

// GET /api/public/tracking/:tenantSlug/:token — seguimiento de un taller SaaS
router.get('/tracking/:tenantSlug/:token', TrackingController.getByToken)

// GET /api/public/tracking/:token — compatibilidad con la instalación legacy
router.get('/tracking/:token', TrackingController.getByToken)

// GET /api/public/tracking/:tenantSlug/:token/pdf — PDF público SaaS
router.get('/tracking/:tenantSlug/:token/pdf', async (req, res, next) => {
  try {
    await withPublicTenant(req, async () => {
      const [[row]] = await getPool().query(
        'SELECT id FROM orders WHERE tracking_token = ?', [req.params.token]
      )
      if (!row) return res.status(404).json({ success: false, message: 'Orden no encontrada' })
      req.params.id = row.id
      return PdfController.getOrderPDF(req, res, next)
    })
  } catch (err) { next(err) }
})

// GET /api/public/tracking/:token/pdf — PDF público legacy
router.get('/tracking/:token/pdf', async (req, res, next) => {
  try {
    const [[row]] = await getPool().query(
      'SELECT id FROM orders WHERE tracking_token = ?', [req.params.token]
    )
    if (!row) return res.status(404).json({ success: false, message: 'Orden no encontrada' })
    req.params.id = row.id
    PdfController.getOrderPDF(req, res, next)
  } catch (err) { next(err) }
})

// GET /api/public/brands?category=    → marcas activas agrupadas por categoría
router.get('/brands', CatalogController.getBrands)

// GET /api/public/products?brand=&category=  → productos disponibles (sanitizados)
router.get('/products', CatalogController.getProducts)

export default router

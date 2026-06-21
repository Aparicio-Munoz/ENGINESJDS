import { Router } from 'express'
import * as TrackingController from '../controllers/tracking.controller.js'
import * as CatalogController from '../controllers/catalog.controller.js'

const router = Router()

// GET /api/public/tracking/:token
router.get('/tracking/:token', TrackingController.getByToken)

// GET /api/public/brands?category=    → marcas activas agrupadas por categoría
router.get('/brands', CatalogController.getBrands)

// GET /api/public/products?brand=&category=  → productos disponibles (sanitizados)
router.get('/products', CatalogController.getProducts)

export default router

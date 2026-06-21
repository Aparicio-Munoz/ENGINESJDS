import { Router } from 'express'
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { createBrandRules, updateBrandRules } from '../validations/brand.validation.js'
import * as BrandController from '../controllers/brand.controller.js'

const router = Router()

router.use(verifyToken)

// GET /api/brands/categories
router.get('/categories', BrandController.getCategories)

// GET /api/brands?search=&category=&status=&sort=&page=&limit=
router.get('/', BrandController.getAll)

// GET /api/brands/:id
router.get('/:id', BrandController.getById)

// POST /api/brands              [Administrador]
router.post('/', requireRole('Administrador'), createBrandRules, validate, BrandController.create)

// PUT /api/brands/:id           [Administrador]
router.put('/:id', requireRole('Administrador'), updateBrandRules, validate, BrandController.update)

// DELETE /api/brands/:id        [Administrador]
router.delete('/:id', requireRole('Administrador'), BrandController.remove)

export default router

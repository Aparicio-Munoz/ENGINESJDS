import { Router } from 'express'
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { createQuickJobRules } from '../validations/quickJob.validation.js'
import * as QuickJobsController from '../controllers/quickJobs.controller.js'

const router = Router()
router.use(verifyToken)

// GET /api/quick-jobs?employee_id=&from=&to=&page=&limit=
router.get('/', QuickJobsController.getAll)

// POST /api/quick-jobs   body: { description, price, employee_id }
router.post('/', createQuickJobRules, validate, QuickJobsController.create)

// DELETE /api/quick-jobs/:id   [Administrador]
router.delete('/:id', requireRole('Administrador'), QuickJobsController.remove)

export default router

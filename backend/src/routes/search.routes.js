import { Router } from 'express'
import { verifyToken } from '../middlewares/auth.middleware.js'
import * as SearchController from '../controllers/search.controller.js'

const router = Router()

router.use(verifyToken)
router.get('/', SearchController.search)

export default router

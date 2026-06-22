import { Router } from 'express'
import { verifyToken } from '../middlewares/auth.middleware.js'
import * as HistoryController from '../controllers/history.controller.js'

const router = Router()
router.use(verifyToken)

router.get('/motorcycle/:id',          HistoryController.getFullHistory)
router.get('/motorcycle/:id/stats',    HistoryController.getStats)
router.get('/motorcycle/:id/timeline', HistoryController.getTimeline)
router.get('/motorcycle/:id/pdf',      HistoryController.getPDF)

export default router

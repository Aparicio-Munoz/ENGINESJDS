import { Router } from 'express'
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import * as ReminderController from '../controllers/reminder.controller.js'

const router = Router()
router.use(verifyToken, requireRole('Administrador'))

router.get('/dashboard', ReminderController.getDashboard)
router.get('/',          ReminderController.getAll)
router.get('/:id',       ReminderController.getById)
router.post('/',         ReminderController.create)
router.put('/:id',       ReminderController.update)
router.delete('/:id',    ReminderController.remove)
router.post('/send/:id', ReminderController.send)

export default router

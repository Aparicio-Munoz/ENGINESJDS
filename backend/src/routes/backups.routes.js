import { Router } from 'express'
import multer from 'multer'
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import * as BackupController from '../controllers/backup.controller.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })

router.use(verifyToken, requireRole('Administrador'))

router.get('/',              BackupController.getAll)
router.get('/stats',         BackupController.getStats)
router.post('/create',       BackupController.create)
router.post('/restore',      upload.single('file'), BackupController.restore)
router.get('/download/:id',  BackupController.download)
router.delete('/:id',        BackupController.remove)

export default router

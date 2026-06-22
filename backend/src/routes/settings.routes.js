import { Router } from 'express'
import multer from 'multer'
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import * as SettingsController from '../controllers/settings.controller.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

router.use(verifyToken, requireRole('Administrador'))

router.get('/',       SettingsController.get)
router.put('/',       SettingsController.update)
router.post('/logo',  upload.single('logo'), SettingsController.uploadLogo)

export default router

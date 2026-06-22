import { ApiResponse } from '../utils/ApiResponse.js'
import * as SettingsService from '../services/settings.service.js'

function actor(req) {
  return { userId: req.user.id, userName: req.user.username, role: req.user.role, ip: req.ip }
}

export async function get(req, res, next) {
  try {
    const settings = await SettingsService.get()
    ApiResponse.success(res, settings)
  } catch (err) { next(err) }
}

export async function update(req, res, next) {
  try {
    const settings = await SettingsService.update(req.body, actor(req))
    ApiResponse.success(res, settings, 'Configuración actualizada')
  } catch (err) { next(err) }
}

export async function uploadLogo(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Imagen requerida' })
    const logoUrl = `/uploads/logo_${Date.now()}_${req.file.originalname}`
    const fs = await import('fs/promises')
    const path = await import('path')
    const dir = path.resolve(process.cwd(), 'storage', 'uploads')
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, path.basename(logoUrl)), req.file.buffer)
    const settings = await SettingsService.updateLogo(logoUrl, actor(req))
    ApiResponse.success(res, settings, 'Logo actualizado')
  } catch (err) { next(err) }
}

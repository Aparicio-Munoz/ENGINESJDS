import { ApiResponse } from '../utils/ApiResponse.js'
import * as BackupService from '../services/backup.service.js'

function buildActor(req) {
  return { userId: req.user.id, userName: req.user.username, role: req.user.role, ip: req.ip }
}

export async function getAll(req, res, next) {
  try {
    const { page, limit } = req.query
    const result = await BackupService.getBackups({ page, limit })
    ApiResponse.paginated(res, result.data, result)
  } catch (err) { next(err) }
}

export async function getStats(req, res, next) {
  try {
    const stats = await BackupService.getStats()
    ApiResponse.success(res, stats)
  } catch (err) { next(err) }
}

export async function create(req, res, next) {
  try {
    const backup = await BackupService.createBackup(buildActor(req))
    ApiResponse.created(res, backup, 'Respaldo creado exitosamente')
  } catch (err) { next(err) }
}

export async function restore(req, res, next) {
  try {
    const result = await BackupService.restoreBackup(req.file, buildActor(req))
    ApiResponse.success(res, result, 'Base de datos restaurada exitosamente')
  } catch (err) { next(err) }
}

export async function download(req, res, next) {
  try {
    const { filepath, filename } = await BackupService.getBackupFile(
      Number(req.params.id), buildActor(req)
    )
    res.download(filepath, filename)
  } catch (err) { next(err) }
}

export async function remove(req, res, next) {
  try {
    await BackupService.deleteBackup(Number(req.params.id), buildActor(req))
    ApiResponse.noContent(res)
  } catch (err) { next(err) }
}

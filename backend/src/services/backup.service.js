import { execFile, spawn } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import { getPool } from '../config/database.js'
import { ApiError } from '../utils/ApiError.js'
import { logAudit } from './audit.service.js'
import { logger } from '../utils/logger.js'

const execFileAsync = promisify(execFile)

const BACKUP_DIR = path.resolve(process.cwd(), 'storage', 'backups')
const MAX_RESTORE_SIZE = 50 * 1024 * 1024 // 50 MB

function getDbConfig() {
  return {
    host:     process.env.DB_HOST     ?? 'localhost',
    port:     process.env.DB_PORT     ?? '3306',
    user:     process.env.DB_USER     ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME     ?? 'engines_jds',
  }
}

function formatFilename() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `engines_jds_${now.getFullYear()}_${pad(now.getMonth() + 1)}_${pad(now.getDate())}_${pad(now.getHours())}_${pad(now.getMinutes())}.sql`
}

// ── Crear respaldo ───────────────────────────────────────────
export async function createBackup(actor = {}) {
  await fs.mkdir(BACKUP_DIR, { recursive: true })

  const db = getDbConfig()
  const filename = formatFilename()
  const filepath = path.join(BACKUP_DIR, filename)

  const args = [
    `-h${db.host}`,
    `-P${db.port}`,
    `-u${db.user}`,
    '--single-transaction',
    '--routines',
    '--triggers',
    '--events',
    db.database,
  ]
  if (db.password) args.splice(3, 0, `-p${db.password}`)

  let status = 'SUCCESS'
  let notes = null

  try {
    const { stdout } = await execFileAsync('mysqldump', args, { maxBuffer: 100 * 1024 * 1024 })
    await fs.writeFile(filepath, stdout, 'utf8')
  } catch (err) {
    status = 'FAILED'
    notes = err.message.substring(0, 500)
    logger.error('Backup failed', { error: err.message })
  }

  let sizeKb = 0
  try {
    const stat = await fs.stat(filepath)
    sizeKb = Math.round(stat.size / 1024)
  } catch { /* file may not exist if failed */ }

  const [result] = await getPool().query(
    `INSERT INTO backups (filename, size_kb, created_by, status, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [filename, sizeKb, actor.userId ?? null, status, notes]
  )

  await logAudit('CREATE_BACKUP', {
    userId: actor.userId, userName: actor.userName, role: actor.role,
    ipAddress: actor.ip, tableName: 'backups', recordId: result.insertId,
    description: `Respaldo ${filename} (${sizeKb} KB) — ${status}`,
  })

  if (status === 'FAILED') {
    throw ApiError.internal(`Error al crear el respaldo: ${notes}`)
  }

  const [rows] = await getPool().query('SELECT * FROM backups WHERE id = ?', [result.insertId])
  return rows[0]
}

// ── Restaurar respaldo ───────────────────────────────────────
export async function restoreBackup(file, actor = {}) {
  if (!file) throw ApiError.badRequest('Archivo SQL requerido')
  if (!file.originalname.endsWith('.sql')) {
    throw ApiError.badRequest('Solo se permiten archivos .sql')
  }
  if (file.size > MAX_RESTORE_SIZE) {
    throw ApiError.badRequest(`El archivo excede el límite de ${MAX_RESTORE_SIZE / 1024 / 1024} MB`)
  }

  const db = getDbConfig()
  const sqlContent = file.buffer.toString('utf8')

  if (!sqlContent.trim()) {
    throw ApiError.badRequest('El archivo SQL está vacío')
  }

  const args = [
    `-h${db.host}`,
    `-P${db.port}`,
    `-u${db.user}`,
    db.database,
  ]
  if (db.password) args.splice(3, 0, `-p${db.password}`)

  try {
    await new Promise((resolve, reject) => {
      const proc = spawn('mysql', args, { stdio: ['pipe', 'pipe', 'pipe'] })
      let stderr = ''
      proc.stderr.on('data', (d) => { stderr += d.toString() })
      proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(stderr || `mysql exited with code ${code}`)))
      proc.on('error', reject)
      proc.stdin.write(sqlContent)
      proc.stdin.end()
    })
  } catch (err) {
    await logAudit('RESTORE_BACKUP', {
      userId: actor.userId, userName: actor.userName, role: actor.role,
      ipAddress: actor.ip,
      description: `Restauración fallida: ${file.originalname} — ${err.message.substring(0, 200)}`,
    })
    throw ApiError.internal(`Error al restaurar: ${err.message.substring(0, 200)}`)
  }

  await logAudit('RESTORE_BACKUP', {
    userId: actor.userId, userName: actor.userName, role: actor.role,
    ipAddress: actor.ip,
    description: `Base de datos restaurada desde ${file.originalname} (${Math.round(file.size / 1024)} KB)`,
  })

  return { filename: file.originalname, sizeKb: Math.round(file.size / 1024) }
}

// ── Listar respaldos ─────────────────────────────────────────
export async function getBackups({ page = 1, limit = 20 } = {}) {
  const pool = getPool()
  const offset = (Number(page) - 1) * Number(limit)

  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM backups')
  const [rows] = await pool.query(
    `SELECT b.*, u.username AS created_by_name
     FROM backups b
     LEFT JOIN users u ON u.id = b.created_by
     ORDER BY b.created_at DESC
     LIMIT ? OFFSET ?`,
    [Number(limit), offset]
  )

  return { data: rows, total: Number(total), page: Number(page), limit: Number(limit) }
}

// ── Descargar respaldo ───────────────────────────────────────
export async function getBackupFile(id, actor = {}) {
  const [rows] = await getPool().query('SELECT * FROM backups WHERE id = ?', [id])
  if (!rows.length) throw ApiError.notFound('Respaldo no encontrado')

  const backup = rows[0]
  const filepath = path.join(BACKUP_DIR, backup.filename)

  try {
    await fs.access(filepath)
  } catch {
    throw ApiError.notFound('El archivo de respaldo ya no existe en el servidor')
  }

  await logAudit('DOWNLOAD_BACKUP', {
    userId: actor.userId, userName: actor.userName, role: actor.role,
    ipAddress: actor.ip, tableName: 'backups', recordId: id,
    description: `Descarga de ${backup.filename}`,
  })

  return { filepath, filename: backup.filename }
}

// ── Eliminar respaldo ────────────────────────────────────────
export async function deleteBackup(id, actor = {}) {
  const [rows] = await getPool().query('SELECT * FROM backups WHERE id = ?', [id])
  if (!rows.length) throw ApiError.notFound('Respaldo no encontrado')

  const backup = rows[0]
  const filepath = path.join(BACKUP_DIR, backup.filename)

  try { await fs.unlink(filepath) } catch { /* file may already be gone */ }
  await getPool().query('DELETE FROM backups WHERE id = ?', [id])

  await logAudit('DELETE_BACKUP', {
    userId: actor.userId, userName: actor.userName, role: actor.role,
    ipAddress: actor.ip, tableName: 'backups', recordId: id,
    description: `Respaldo ${backup.filename} eliminado`,
  })
}

// ── Estadísticas ─────────────────────────────────────────────
export async function getStats() {
  const pool = getPool()
  const [[stats]] = await pool.query(
    `SELECT
       COUNT(*) AS total_backups,
       COALESCE(SUM(size_kb), 0) AS total_size_kb,
       MAX(created_at) AS last_backup_at,
       (SELECT status FROM backups ORDER BY created_at DESC LIMIT 1) AS last_status
     FROM backups`
  )
  return {
    totalBackups: Number(stats.total_backups),
    totalSizeKb:  Number(stats.total_size_kb),
    lastBackupAt: stats.last_backup_at,
    lastStatus:   stats.last_status,
  }
}

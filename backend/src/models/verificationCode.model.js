import { getPool } from '../config/database.js'

// ── Crear un código de verificación ──────────────────────────
export async function create({ userId, type, codeHash, expiresAt }) {
  const [result] = await getPool().query(
    `INSERT INTO verification_codes (user_id, type, code_hash, expires_at)
     VALUES (?, ?, ?, ?)`,
    [userId, type, codeHash, expiresAt]
  )
  return result.insertId
}

// ── Buscar el código activo más reciente (no usado, no expirado) ─
export async function findActive({ userId, type }) {
  const [rows] = await getPool().query(
    `SELECT id, user_id, type, code_hash, attempts, expires_at, used_at, created_at
     FROM verification_codes
     WHERE user_id = ? AND type = ? AND used_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, type]
  )
  return rows[0] ?? null
}

// ── Marcar un código como usado ──────────────────────────────
export async function markAsUsed(id) {
  await getPool().query(
    'UPDATE verification_codes SET used_at = NOW() WHERE id = ?',
    [id]
  )
}

// ── Incrementar el contador de intentos fallidos ─────────────
export async function incrementAttempts(id) {
  await getPool().query(
    'UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?',
    [id]
  )
}

// ── Eliminar todos los códigos de un usuario para un tipo dado ─
export async function deleteByUserAndType(userId, type) {
  await getPool().query(
    'DELETE FROM verification_codes WHERE user_id = ? AND type = ?',
    [userId, type]
  )
}

// ── Limpieza de códigos expirados (mantenimiento) ────────────
export async function deleteExpired() {
  await getPool().query(
    'DELETE FROM verification_codes WHERE expires_at < NOW()'
  )
}

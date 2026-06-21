import crypto from 'crypto'
import { getPool } from '../config/database.js'

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}

// ── Crear refresh token ──────────────────────────────────────
export async function create({ userId, tokenHash, expiresAt, ip = null }) {
  await getPool().query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip)
     VALUES (?, ?, ?, ?)`,
    [userId, tokenHash, expiresAt, ip]
  )
}

// ── Buscar token válido (no revocado, no expirado) ───────────
export async function findValid(tokenHash) {
  const [rows] = await getPool().query(
    `SELECT id, user_id, expires_at
     FROM refresh_tokens
     WHERE token_hash = ? AND revoked = 0 AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  )
  return rows[0] ?? null
}

// ── Revocar un token (logout) ────────────────────────────────
export async function revoke(tokenHash) {
  const [result] = await getPool().query(
    'UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?',
    [tokenHash]
  )
  return result.affectedRows > 0
}

// ── Revocar todos los tokens de un usuario ───────────────────
export async function revokeAllForUser(userId) {
  await getPool().query(
    'UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ? AND revoked = 0',
    [userId]
  )
}

// ── Limpieza de tokens expirados/revocados ───────────────────
export async function purgeExpired() {
  await getPool().query(
    'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = 1'
  )
}

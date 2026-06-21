import { getPool } from '../config/database.js'

// ── Estado de bloqueo de una IP ──────────────────────────────
// Devuelve { blocked, secondsLeft, attempts }. Todas las
// comparaciones de tiempo se hacen en SQL con NOW() para evitar
// desajustes de zona horaria entre MySQL y Node.
export async function getStatus(ip) {
  const pool = getPool()

  // Desbloqueo automático: si el bloqueo ya expiró, limpiar contador
  await pool.query(
    `UPDATE login_attempts
     SET attempts = 0, blocked_until = NULL
     WHERE ip = ? AND blocked_until IS NOT NULL AND blocked_until <= NOW()`,
    [ip]
  )

  const [rows] = await pool.query(
    `SELECT attempts,
            (blocked_until IS NOT NULL AND blocked_until > NOW())        AS is_blocked,
            GREATEST(TIMESTAMPDIFF(SECOND, NOW(), blocked_until), 0)     AS seconds_left
     FROM login_attempts WHERE ip = ?`,
    [ip]
  )
  if (!rows.length) return { blocked: false, secondsLeft: 0, attempts: 0 }

  const row = rows[0]
  return {
    blocked: Boolean(Number(row.is_blocked)),
    secondsLeft: Number(row.seconds_left) || 0,
    attempts: Number(row.attempts),
  }
}

// ── Registrar un intento fallido ─────────────────────────────
// Incrementa el contador; al alcanzar maxAttempts bloquea la IP
// por blockMinutes. Devuelve el estado resultante.
export async function recordFailure(ip, email, maxAttempts, blockMinutes) {
  const pool = getPool()

  await pool.query(
    `INSERT INTO login_attempts (ip, email, attempts, last_attempt_at)
     VALUES (?, ?, 1, NOW())
     ON DUPLICATE KEY UPDATE
       attempts = attempts + 1,
       email = VALUES(email),
       last_attempt_at = NOW()`,
    [ip, email ?? null]
  )

  const [[row]] = await pool.query(
    'SELECT attempts FROM login_attempts WHERE ip = ?',
    [ip]
  )
  const attempts = Number(row.attempts)

  if (attempts >= maxAttempts) {
    await pool.query(
      `UPDATE login_attempts
       SET blocked_until = DATE_ADD(NOW(), INTERVAL ? MINUTE)
       WHERE ip = ?`,
      [blockMinutes, ip]
    )
    const [[blockedRow]] = await pool.query(
      'SELECT blocked_until FROM login_attempts WHERE ip = ?',
      [ip]
    )
    return {
      attempts,
      blocked: true,
      blockedUntil: blockedRow.blocked_until ? new Date(blockedRow.blocked_until) : null,
      remaining: 0,
    }
  }

  return {
    attempts,
    blocked: false,
    blockedUntil: null,
    remaining: Math.max(0, maxAttempts - attempts),
  }
}

// ── Resetear intentos (login exitoso) ────────────────────────
export async function reset(ip) {
  await getPool().query('DELETE FROM login_attempts WHERE ip = ?', [ip])
}

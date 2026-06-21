import mysql from 'mysql2/promise'
import { logger } from '../utils/logger.js'

let pool = null

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host:               process.env.DB_HOST     ?? 'localhost',
      port:               Number(process.env.DB_PORT ?? 3306),
      user:               process.env.DB_USER,
      password:           process.env.DB_PASSWORD,
      database:           process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit:    Number(process.env.DB_CONNECTION_LIMIT ?? 10),
      queueLimit:         0,
      timezone:           'Z',
      // Convertir tipos correctamente (BIGINT → Number, DECIMAL → string para precisión)
      supportBigNumbers:  true,
      bigNumberStrings:   false,
    })
  }
  return pool
}

export async function testConnection() {
  const conn = await getPool().getConnection()
  const [rows] = await conn.query('SELECT VERSION() AS version')
  conn.release()
  logger.info('MySQL conectado', {
    host:    process.env.DB_HOST,
    db:      process.env.DB_NAME,
    version: rows[0].version,
  })
}

export async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
    logger.info('Pool de conexiones MySQL cerrado')
  }
}

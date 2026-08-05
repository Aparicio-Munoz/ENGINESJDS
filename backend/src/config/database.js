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
      // Requerido por proveedores gestionados con TLS forzado (ej. Aiven).
      // Con DB_SSL_CA (PEM) se verifica la identidad del servidor; sin ella,
      // la conexión va cifrada pero sin verificación de CA (Aiven usa CA propia).
      ssl: process.env.DB_SSL === 'true'
        ? {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: Boolean(process.env.DB_SSL_CA),
            ca: process.env.DB_SSL_CA ? process.env.DB_SSL_CA.replace(/\\n/g, '\n') : undefined,
          }
        : undefined,
    })

    // Algunos proveedores gestionados (ej. Aiven) traen sql_mode ANSI global
    // (ANSI_QUOTES, PIPES_AS_CONCAT) — se fija el modo estándar de MySQL por
    // sesión para que las queries se comporten igual que en desarrollo local.
    pool.on('connection', (conn) => {
      conn.query(
        "SET SESSION sql_mode = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'"
      )
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

import mysql from 'mysql2/promise'
import { logger } from '../utils/logger.js'
import { getTenantContext } from './requestContext.js'

const pools = new Map()

const DATABASE_NAME_PATTERN = /^[A-Za-z0-9_]{1,64}$/

function createPool(databaseName) {
  if (!DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error('Nombre de base de datos inválido')
  }

  const isTenantDatabase = databaseName !== process.env.DB_NAME
  const connectionLimit = isTenantDatabase
    ? Number(process.env.TENANT_DB_CONNECTION_LIMIT ?? process.env.DB_CONNECTION_LIMIT ?? 5)
    : Number(process.env.DB_CONNECTION_LIMIT ?? 10)

  const pool = mysql.createPool({
    host:               process.env.DB_HOST     ?? 'localhost',
    port:               Number(process.env.DB_PORT ?? 3306),
    user:               process.env.DB_USER,
    password:           process.env.DB_PASSWORD,
    database:           databaseName,
    waitForConnections: true,
    connectionLimit,
    queueLimit:         0,
    timezone:           'Z',
    supportBigNumbers:  true,
    bigNumberStrings:   false,
    ssl: process.env.DB_SSL === 'true'
      ? {
          minVersion: 'TLSv1.2',
          rejectUnauthorized: Boolean(process.env.DB_SSL_CA),
          ca: process.env.DB_SSL_CA ? process.env.DB_SSL_CA.replace(/\\n/g, '\n') : undefined,
        }
      : undefined,
  })

  pool.on('connection', (conn) => {
    conn.query(
      "SET SESSION sql_mode = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'"
    )
  })

  return pool
}

export function resolveDatabaseName(databaseName = null, context = getTenantContext()) {
  const resolvedDatabase = databaseName ?? context?.databaseName ?? process.env.DB_NAME

  if (!resolvedDatabase) throw new Error('DB_NAME no configurado')
  if (!DATABASE_NAME_PATTERN.test(resolvedDatabase)) {
    throw new Error('Nombre de base de datos inválido')
  }
  return resolvedDatabase
}

export function getPool(databaseName = null) {
  const resolvedDatabase = resolveDatabaseName(databaseName)

  if (!pools.has(resolvedDatabase)) pools.set(resolvedDatabase, createPool(resolvedDatabase))
  return pools.get(resolvedDatabase)
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
  if (pools.size) {
    await Promise.all([...pools.values()].map((currentPool) => currentPool.end()))
    pools.clear()
    logger.info('Pools de conexiones MySQL cerrados')
  }
}

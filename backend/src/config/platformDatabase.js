import mysql from 'mysql2/promise'
import { isSaaSEnabled } from './saas.js'

let platformPool = null

function value(name, fallbackName) {
  return process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined)
}

function sslConfig(prefix, fallbackPrefix = 'DB') {
  const enabled = value(`${prefix}_SSL`, `${fallbackPrefix}_SSL`) === 'true'
  if (!enabled) return undefined

  const ca = value(`${prefix}_SSL_CA`, `${fallbackPrefix}_SSL_CA`)
  return {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: Boolean(ca),
    ca: ca ? ca.replace(/\\n/g, '\n') : undefined,
  }
}

function commonOptions(prefix, fallbackPrefix = 'DB') {
  return {
    host:     value(`${prefix}_HOST`, `${fallbackPrefix}_HOST`) ?? 'localhost',
    port:     Number(value(`${prefix}_PORT`, `${fallbackPrefix}_PORT`) ?? 3306),
    user:     value(`${prefix}_USER`, `${fallbackPrefix}_USER`),
    password: value(`${prefix}_PASSWORD`, `${fallbackPrefix}_PASSWORD`),
    ssl:      sslConfig(prefix, fallbackPrefix),
  }
}

export function getPlatformPool() {
  if (!isSaaSEnabled()) {
    throw new Error('La plataforma SaaS no está habilitada')
  }

  if (!platformPool) {
    platformPool = mysql.createPool({
      ...commonOptions('PLATFORM_DB'),
      database: process.env.PLATFORM_DB_NAME ?? 'engines_platform',
      waitForConnections: true,
      connectionLimit: Number(process.env.PLATFORM_DB_CONNECTION_LIMIT ?? 5),
      queueLimit: 0,
      timezone: 'Z',
      supportBigNumbers: true,
      bigNumberStrings: false,
    })
  }

  return platformPool
}

export async function createProvisioningConnection() {
  if (!isSaaSEnabled()) {
    throw new Error('La plataforma SaaS no está habilitada')
  }

  return mysql.createConnection({
    ...commonOptions('PROVISIONER_DB', 'PLATFORM_DB'),
    // El aprovisionador necesita CREATE DATABASE y no selecciona
    // ninguna base antes de crear el tenant.
  })
}

export async function testPlatformConnection() {
  const [rows] = await getPlatformPool().query('SELECT 1 FROM tenants LIMIT 1')
  return rows
}

export async function closePlatformPool() {
  if (platformPool) {
    await platformPool.end()
    platformPool = null
  }
}

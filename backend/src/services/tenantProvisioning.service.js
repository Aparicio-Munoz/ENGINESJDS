import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { ApiError } from '../utils/ApiError.js'
import { isSaaSEnabled, getTrialDays } from '../config/saas.js'
import { createProvisioningConnection } from '../config/platformDatabase.js'
import * as PlatformModel from '../models/platform.model.js'
import * as UserModel from '../models/user.model.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATABASE_DIR = path.resolve(__dirname, '../../../database')
const SKIPPED_TENANT_FILES = new Set(['03_seed.sql', '20_clear_demo_data.sql'])
const DATABASE_NAME_PATTERN = /^[A-Za-z0-9_]{1,64}$/

function quoteIdentifier(value) {
  if (!DATABASE_NAME_PATTERN.test(value)) throw new Error('Identificador de base de datos inválido')
  return `\`${value.replaceAll('`', '``')}\``
}

function createSlug(value) {
  const base = String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 55) || 'taller'

  return `${base}-${crypto.randomBytes(3).toString('hex')}`
}

function createDatabaseName() {
  return `engines_tenant_${crypto.randomBytes(12).toString('hex')}`
}

export function splitSqlStatements(sql) {
  const statements = []
  let delimiter = ';'
  let buffer = ''
  let routineStatement = false

  for (const line of sql.split(/\r?\n/)) {
    const trimmed = line.trim()

    if (/^DELIMITER\s+/i.test(trimmed)) {
      delimiter = trimmed.replace(/^DELIMITER\s+/i, '').trim()
      continue
    }

    buffer += `${line}\n`
    if (!routineStatement && /^\s*CREATE\s+(?:TRIGGER|PROCEDURE|FUNCTION)\b/i.test(buffer)) {
      routineStatement = true
    }

    // Algunas migraciones históricas definen triggers con BEGIN/END sin
    // cambiar DELIMITER. En ese caso los ; internos no terminan la sentencia.
    if (routineStatement && delimiter === ';' && !/^END\s*;\s*$/i.test(trimmed)) {
      continue
    }
    let statement = null
    if (delimiter === ';') {
      // Las migraciones pueden documentar la línea después del ;. Ese
      // comentario no pertenece a la sentencia siguiente ni debe convertir
      // dos UPDATE en una consulta múltiple.
      const terminator = buffer.match(/;[ \t]*(?:--[^\r\n]*)?(?:\r?\n)?$/)
      if (!terminator) continue
      statement = buffer.slice(0, terminator.index).trim()
    } else {
      if (!buffer.trimEnd().endsWith(delimiter)) continue
      statement = buffer.trimEnd().slice(0, -delimiter.length).trim()
    }

    if (statement) statements.push(statement)
    buffer = ''
    routineStatement = false
  }

  const finalStatement = buffer.trim()
  if (finalStatement) statements.push(finalStatement)
  return statements
}

function adaptSqlToTenant(sql, databaseName) {
  const identifier = quoteIdentifier(databaseName)
  return sql
    .replaceAll('CREATE DATABASE IF NOT EXISTS engines_jds', `CREATE DATABASE IF NOT EXISTS ${identifier}`)
    .replaceAll('USE engines_jds', `USE ${identifier}`)
}

export function isTenantSeedStatement(statement) {
  const executable = String(statement).replace(
    /^\s*(?:(?:--[^\n]*(?:\n|$))|(?:\/\*[\s\S]*?\*\/\s*))*/,
    ''
  )
  return /^INSERT\s+INTO\s+/i.test(executable)
}

async function getTenantSqlFiles() {
  const entries = await fs.readdir(DATABASE_DIR, { withFileTypes: true })

  return entries
    .filter((entry) => entry.isFile() && /^\d+_.*\.sql$/.test(entry.name))
    .map((entry) => entry.name)
    .filter((name) => !SKIPPED_TENANT_FILES.has(name))
    .sort((a, b) => {
      const numberA = Number(a.match(/^\d+/)?.[0] ?? 0)
      const numberB = Number(b.match(/^\d+/)?.[0] ?? 0)
      return numberA - numberB
    })
}

async function executeTenantSchema(connection, databaseName) {
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(databaseName)}
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )

  for (const filename of await getTenantSqlFiles()) {
    const originalSql = await fs.readFile(path.join(DATABASE_DIR, filename), 'utf8')
    const sql = adaptSqlToTenant(originalSql, databaseName)

    for (const statement of splitSqlStatements(sql)) {
      // La instalación legacy contiene semillas y conversiones de datos
      // históricas. Un tenant nace sin catálogo, clientes ni operaciones;
      // los INSERT dentro de triggers siguen siendo parte del DDL y no
      // coinciden con esta condición porque la sentencia inicia con CREATE.
      if (isTenantSeedStatement(statement)) continue
      try {
        await connection.query(statement)
      } catch (error) {
        // El job conserva sólo archivo y código SQL; nunca la sentencia ni
        // posibles valores sensibles enviados por MySQL.
        error.provisioningFile = filename
        throw error
      }
    }
  }
}

async function ensureTenantSettings(connection, businessName) {
  const [columns] = await connection.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'settings'
       AND COLUMN_NAME = 'allow_public_registration'`
  )

  if (Number(columns[0].count) === 0) {
    await connection.query(
      `ALTER TABLE settings
       ADD COLUMN allow_public_registration TINYINT(1) NOT NULL DEFAULT 0
       COMMENT 'Registro público de usuarios del taller'`
    )
  }

  await connection.query(
    `INSERT INTO settings (id, business_name, allow_public_registration)
     VALUES (1, ?, 0)
     ON DUPLICATE KEY UPDATE
       business_name = VALUES(business_name),
       allow_public_registration = VALUES(allow_public_registration)`,
    [businessName]
  )
}

async function createTenantAdmin(connection, { username, email, passwordHash }) {
  await connection.query(
    `INSERT INTO roles (id, name, description) VALUES
       (1, 'Administrador', 'Acceso completo al panel'),
       (2, 'Técnico', 'Gestión de órdenes y servicios asignados'),
       (3, 'Recepcionista', 'Clientes, citas y registro de órdenes')
     ON DUPLICATE KEY UPDATE description = VALUES(description)`,
  )

  await connection.query(
    `INSERT INTO users (role_id, username, email, password_hash, status)
     SELECT id, ?, ?, ?, 'Activo'
     FROM roles
     WHERE name = 'Administrador'`,
    [username, email, passwordHash]
  )
}

async function provisionDatabase({ databaseName, businessName, username, email, passwordHash }) {
  const connection = await createProvisioningConnection()

  try {
    await executeTenantSchema(connection, databaseName)
    await ensureTenantSettings(connection, businessName)
    await createTenantAdmin(connection, { username, email, passwordHash })
  } finally {
    await connection.end()
  }
}

async function removeIncompleteDatabase(databaseName) {
  const connection = await createProvisioningConnection()
  try {
    await connection.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`)
  } finally {
    await connection.end()
  }
}

export async function registerWorkshop({ businessName, username, email, password }) {
  if (!isSaaSEnabled()) {
    throw ApiError.forbidden('El registro de talleres no está habilitado')
  }

  if (await PlatformModel.findAccountByEmail(email)) {
    throw ApiError.conflict('El correo electrónico ya está registrado')
  }

  // Evita ambigüedad con las cuentas históricas de engines_jds mientras
  // ambas identidades conviven durante la migración gradual.
  if (await UserModel.emailExists(email)) {
    throw ApiError.conflict('El correo electrónico ya está registrado')
  }

  const slug = createSlug(businessName)
  const databaseName = createDatabaseName()
  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS ?? 12))
  const trialEndsAt = new Date(Date.now() + getTrialDays() * 86_400_000)

  let tenant
  try {
    tenant = await PlatformModel.createTenantBundle({
      slug,
      businessName,
      ownerName: username,
      databaseName,
      username,
      email,
      passwordHash,
      trialEndsAt,
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw ApiError.conflict('El correo electrónico ya está registrado')
    }
    throw error
  }

  try {
    await PlatformModel.markProvisioningRunning(tenant.tenantId)
    await provisionDatabase({ databaseName, businessName, username, email, passwordHash })
    await PlatformModel.markProvisioningCompleted(tenant.tenantId)
  } catch (error) {
    // La base se genera con un identificador aleatorio y sólo se elimina si
    // este intento no se completó. Así no queda un tenant parcialmente
    // creado ni se toca engines_jds ni una base preexistente.
    try {
      await removeIncompleteDatabase(databaseName)
    } catch {
      // El job queda FAILED para que soporte pueda revisar el recurso.
    }
    const diagnostic = [error.code ?? 'provisioning_error', error.provisioningFile]
      .filter(Boolean)
      .join(' en ')
    await PlatformModel.markProvisioningFailed(tenant.tenantId, diagnostic)
    throw ApiError.internal('No fue posible preparar el espacio del taller. Intenta nuevamente.')
  }

  return {
    tenantId: tenant.tenantId,
    slug,
    businessName,
    trialEndsAt,
    loginEmail: email,
  }
}

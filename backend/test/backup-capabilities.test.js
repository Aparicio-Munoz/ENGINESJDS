import assert from 'node:assert/strict'
import test from 'node:test'
import { ensureRestoreAvailable, getCapabilities } from '../src/controllers/backup.controller.js'
import { createBackup, getBackupCapabilities, restoreBackup } from '../src/services/backup.service.js'

async function withEnvironment(values, callback) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]))
  Object.assign(process.env, values)
  try {
    return await callback()
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

test('Vercel expone respaldos gestionados y bloquea operaciones manuales', () => {
  const capabilities = getBackupCapabilities({
    VERCEL: '1',
    DATABASE_PROVIDER: 'aiven',
  })

  assert.deepEqual(capabilities, {
    mode: 'managed',
    provider: 'Aiven',
    manualBackupAvailable: false,
    manualRestoreAvailable: false,
  })
})

test('la restauración manual requiere habilitación explícita fuera de serverless', () => {
  const capabilities = getBackupCapabilities({
    BACKUP_MANUAL_ENABLED: 'true',
  })

  assert.equal(capabilities.mode, 'manual')
  assert.equal(capabilities.manualBackupAvailable, true)
  assert.equal(capabilities.manualRestoreAvailable, false)
})

test('la restauración nunca se habilita en producción', () => {
  const capabilities = getBackupCapabilities({
    NODE_ENV: 'production',
    BACKUP_MANUAL_ENABLED: 'true',
    BACKUP_RESTORE_ENABLED: 'true',
  })

  assert.equal(capabilities.manualBackupAvailable, true)
  assert.equal(capabilities.manualRestoreAvailable, false)
})

test('el host de Aiven se identifica sin exponer configuración de base de datos', () => {
  const capabilities = getBackupCapabilities({
    VERCEL: '1',
    DB_HOST: 'mysql-example.aivencloud.com',
  })

  assert.equal(capabilities.provider, 'Aiven')
})

test('crear respaldo en Vercel falla antes de acceder a la base de datos', async () => {
  await withEnvironment({ VERCEL: '1' }, async () => {
    await assert.rejects(createBackup(), /entorno serverless/)
  })
})

test('restaurar exige habilitación explícita antes de procesar el archivo', async () => {
  await withEnvironment({
    VERCEL: '',
    BACKUP_MANUAL_ENABLED: 'true',
    BACKUP_RESTORE_ENABLED: 'false',
  }, async () => {
    await assert.rejects(
      restoreBackup({ originalname: 'respaldo.sql', size: 1, buffer: Buffer.from('SELECT 1') }),
      /restauración manual está deshabilitada/
    )
  })
})

test('endpoint de capacidades no revela configuración y expone modo gestionado', async () => {
  await withEnvironment({ VERCEL: '1', DATABASE_PROVIDER: 'aiven' }, async () => {
    let statusCode
    let payload
    await getCapabilities({}, {
      status: (code) => {
        statusCode = code
        return { json: (body) => { payload = body } }
      },
    }, assert.fail)

    assert.equal(statusCode, 200)
    assert.deepEqual(payload.data, {
      mode: 'managed',
      provider: 'Aiven',
      manualBackupAvailable: false,
      manualRestoreAvailable: false,
    })
    assert.equal(JSON.stringify(payload).includes('DB_HOST'), false)
  })
})

test('restauración gestionada se rechaza antes de que Multer procese el archivo', async () => {
  await withEnvironment({ VERCEL: '1' }, async () => {
    const error = await new Promise((resolve) => ensureRestoreAvailable({}, {}, resolve))
    assert.match(error.message, /entorno serverless/)
  })
})

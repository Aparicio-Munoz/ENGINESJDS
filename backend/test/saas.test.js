import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test from 'node:test'
import { validationResult } from 'express-validator'
import { workshopRegistrationRules } from '../src/validations/onboarding.validation.js'
import { runWithTenantContext } from '../src/config/requestContext.js'
import { resolveDatabaseName } from '../src/config/database.js'
import { tenantTokenMatches } from '../src/middlewares/auth.middleware.js'
import { verifyWebhookSignature } from '../src/services/billing.service.js'
import { isTenantSeedStatement, splitSqlStatements } from '../src/services/tenantProvisioning.service.js'

async function validateWorkshopRegistration(payload) {
  const req = { body: { ...payload } }
  for (const rule of workshopRegistrationRules) await rule.run(req)
  return validationResult(req).array()
}

test('cada contexto resuelve exclusivamente su base de tenant', async () => {
  process.env.DB_NAME = 'engines_jds'
  const tenantA = { id: 10, databaseName: 'engines_tenant_alpha' }
  const tenantB = { id: 11, databaseName: 'engines_tenant_beta' }

  const [databaseA, databaseB] = await Promise.all([
    runWithTenantContext(tenantA, async () => resolveDatabaseName()),
    runWithTenantContext(tenantB, async () => resolveDatabaseName()),
  ])

  assert.equal(databaseA, tenantA.databaseName)
  assert.equal(databaseB, tenantB.databaseName)
  assert.notEqual(databaseA, databaseB)

  const tenant = { id: 10, database_name: tenantA.databaseName }
  assert.equal(tenantTokenMatches(tenant, { tenantId: 10, tenantDatabaseName: tenantA.databaseName }), true)
  assert.equal(tenantTokenMatches(tenant, { tenantId: 11, tenantDatabaseName: tenantB.databaseName }), false)
})

test('el registro rechaza usuario inválido y contraseñas diferentes', async () => {
  const invalidUser = await validateWorkshopRegistration({
    businessName: 'Taller Uno', username: 'usuario con espacio', email: 'uno@example.test',
    password: 'Clave123', confirmPassword: 'Clave123',
  })
  assert.ok(invalidUser.some((error) => error.path === 'username'))

  const mismatchedPassword = await validateWorkshopRegistration({
    businessName: 'Taller Uno', username: 'taller.uno', email: 'uno@example.test',
    password: 'Clave123', confirmPassword: 'OtraClave123',
  })
  assert.ok(mismatchedPassword.some((error) => error.path === 'confirmPassword'))
})

test('el esquema de un tenant descarta semillas históricas', () => {
  assert.equal(isTenantSeedStatement('-- Catálogo heredado\nINSERT INTO brands (name) VALUES (\'Marca\')'), true)
  assert.equal(isTenantSeedStatement('CREATE TRIGGER example AFTER INSERT ON orders FOR EACH ROW BEGIN SELECT 1; END'), false)
})

test('el aprovisionador conserva completo un trigger legacy sin DELIMITER', () => {
  const statements = splitSqlStatements(`
CREATE TRIGGER sample BEFORE INSERT ON sample_table FOR EACH ROW
BEGIN
  DECLARE sequence_number INT;
  SET sequence_number = 1;
END;
`)
  assert.equal(statements.length, 1)
  assert.match(statements[0], /DECLARE sequence_number INT/)
  assert.match(statements[0], /END$/)
})

test('el aprovisionador separa sentencias con comentario posterior al punto y coma', () => {
  const statements = splitSqlStatements(`
UPDATE inventory SET category = 'Motor'; -- comentario histórico
UPDATE inventory SET category = 'Transmisión';
`)
  assert.deepEqual(statements, [
    "UPDATE inventory SET category = 'Motor'",
    "UPDATE inventory SET category = 'Transmisión'",
  ])
})

test('la firma de Stripe válida se acepta y una firma alterada se rechaza', () => {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_only'
  const rawBody = JSON.stringify({ id: 'evt_test', type: 'invoice.paid' })
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = crypto
    .createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex')

  assert.equal(verifyWebhookSignature(rawBody, `t=${timestamp},v1=${signature}`), true)
  assert.equal(verifyWebhookSignature(rawBody, `t=${timestamp},v1=${'0'.repeat(64)}`), false)
})

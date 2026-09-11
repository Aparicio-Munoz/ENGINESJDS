import { getPlatformPool } from '../config/platformDatabase.js'

const ACCOUNT_SELECT = `
  SELECT
    a.id AS account_id,
    a.tenant_id,
    a.username,
    a.email,
    a.password_hash,
    a.role,
    a.status AS account_status,
    t.slug,
    t.business_name,
    t.database_name,
    t.status AS tenant_status,
    t.trial_ends_at,
    s.plan_code,
    s.status AS subscription_status,
    s.current_period_end
  FROM platform_accounts a
  INNER JOIN tenants t ON t.id = a.tenant_id
  LEFT JOIN subscriptions s ON s.tenant_id = t.id
`

export async function findAccountByEmail(email) {
  const [rows] = await getPlatformPool().query(
    `${ACCOUNT_SELECT} WHERE a.email = ? LIMIT 1`,
    [email]
  )
  return rows[0] ?? null
}

export async function findAccountByTenantAndEmail(tenantId, email) {
  const [rows] = await getPlatformPool().query(
    `${ACCOUNT_SELECT} WHERE a.tenant_id = ? AND a.email = ? LIMIT 1`,
    [tenantId, email]
  )
  return rows[0] ?? null
}

export async function findTenantOwnerAccount(tenantId) {
  const [rows] = await getPlatformPool().query(
    `${ACCOUNT_SELECT}
     WHERE a.tenant_id = ?
     ORDER BY (a.role = 'Administrador') DESC, a.id ASC
     LIMIT 1`,
    [tenantId]
  )
  return rows[0] ?? null
}

export async function createAccount({ tenantId, username, email, passwordHash, role, status = 'Activo' }) {
  await getPlatformPool().query(
    `INSERT INTO platform_accounts
       (tenant_id, username, email, password_hash, role, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [tenantId, username, email, passwordHash, role, status]
  )
}

export async function updateAccount({ tenantId, oldEmail, username, email, role, status }) {
  const sets = []
  const params = []

  for (const [field, value] of Object.entries({ username, email, role, status })) {
    if (value !== undefined) {
      sets.push(`${field} = ?`)
      params.push(value)
    }
  }
  if (!sets.length) return

  params.push(tenantId, oldEmail)
  await getPlatformPool().query(
    `UPDATE platform_accounts
     SET ${sets.join(', ')}
     WHERE tenant_id = ? AND email = ?`,
    params
  )
}

export async function updateAccountPassword(tenantId, email, passwordHash) {
  const [result] = await getPlatformPool().query(
    `UPDATE platform_accounts SET password_hash = ? WHERE tenant_id = ? AND email = ?`,
    [passwordHash, tenantId, email]
  )
  if (!result.affectedRows) throw new Error('Cuenta SaaS no encontrada para sincronizar la contraseña')
}

export async function removeAccount(tenantId, email) {
  await getPlatformPool().query(
    'DELETE FROM platform_accounts WHERE tenant_id = ? AND email = ?',
    [tenantId, email]
  )
}

export async function updateSubscription({
  tenantId,
  status,
  provider = 'stripe',
  providerCustomerId = null,
  providerSubscriptionId = null,
  currentPeriodStart = null,
  currentPeriodEnd = null,
}) {
  const tenantStatus = {
    TRIALING: 'TRIALING',
    ACTIVE: 'ACTIVE',
    PAST_DUE: 'PAST_DUE',
    SUSPENDED: 'SUSPENDED',
    CANCELLED: 'CANCELLED',
  }[status] ?? 'SUSPENDED'

  const [result] = await getPlatformPool().query(
    `UPDATE subscriptions
     SET status = ?, provider = ?, provider_customer_id = COALESCE(?, provider_customer_id),
         provider_subscription_id = COALESCE(?, provider_subscription_id),
         current_period_start = COALESCE(?, current_period_start),
         current_period_end = COALESCE(?, current_period_end)
     WHERE tenant_id = ?
       AND (provider_subscription_id IS NULL OR provider_subscription_id = ?)`,
    [
      status, provider, providerCustomerId, providerSubscriptionId,
      currentPeriodStart, currentPeriodEnd, tenantId, providerSubscriptionId,
    ]
  )
  if (!result.affectedRows) return false

  await getPlatformPool().query(
    'UPDATE tenants SET status = ? WHERE id = ?',
    [tenantStatus, tenantId]
  )
  return true
}

export async function updateSubscriptionReferences({
  tenantId,
  providerCustomerId,
  providerSubscriptionId,
}) {
  await getPlatformPool().query(
    `UPDATE subscriptions
     SET provider = 'stripe', provider_customer_id = ?, provider_subscription_id = ?
     WHERE tenant_id = ?`,
    [providerCustomerId, providerSubscriptionId, tenantId]
  )
}

export async function findTenantById(tenantId) {
  const [rows] = await getPlatformPool().query(
    `SELECT
       t.id,
       t.slug,
       t.business_name,
       t.database_name,
       t.status AS tenant_status,
       t.trial_ends_at,
       s.plan_code,
       s.status AS subscription_status,
       s.current_period_end
     FROM tenants t
     LEFT JOIN subscriptions s ON s.tenant_id = t.id
     WHERE t.id = ?
     LIMIT 1`,
    [tenantId]
  )
  return rows[0] ?? null
}

export async function findTenantBySlug(slug) {
  const [rows] = await getPlatformPool().query(
    `SELECT
       t.id,
       t.slug,
       t.business_name,
       t.database_name,
       t.status AS tenant_status,
       t.trial_ends_at,
       s.plan_code,
       s.status AS subscription_status,
       s.current_period_end
     FROM tenants t
     LEFT JOIN subscriptions s ON s.tenant_id = t.id
     WHERE t.slug = ?
     LIMIT 1`,
    [slug]
  )
  return rows[0] ?? null
}

export function tenantHasAccess(tenant) {
  if (!tenant || !['TRIALING', 'ACTIVE'].includes(tenant.tenant_status)) return false
  if (!['TRIALING', 'ACTIVE'].includes(tenant.subscription_status)) return false

  if (
    tenant.subscription_status === 'TRIALING' &&
    tenant.trial_ends_at &&
    new Date(tenant.trial_ends_at).getTime() < Date.now()
  ) {
    return false
  }

  if (
    tenant.subscription_status === 'ACTIVE' &&
    tenant.current_period_end &&
    new Date(tenant.current_period_end).getTime() < Date.now()
  ) {
    return false
  }

  return true
}

// Cuando termina la prueba, el administrador conserva acceso exclusivo al
// módulo de facturación para poder renovar. Los tenants que fallaron durante
// el aprovisionamiento quedan para revisión de soporte.
export function tenantCanManageBilling(tenant) {
  return Boolean(tenant && tenant.tenant_status !== 'FAILED')
}

export async function findTenantIdByProviderSubscription(providerSubscriptionId) {
  const [rows] = await getPlatformPool().query(
    `SELECT tenant_id FROM subscriptions
     WHERE provider_subscription_id = ?
     LIMIT 1`,
    [providerSubscriptionId]
  )
  return rows[0]?.tenant_id ?? null
}

export async function createTenantBundle({
  slug,
  businessName,
  ownerName,
  databaseName,
  username,
  email,
  passwordHash,
  trialEndsAt,
}) {
  const connection = await getPlatformPool().getConnection()

  try {
    await connection.beginTransaction()

    const [tenantResult] = await connection.query(
      `INSERT INTO tenants
         (slug, business_name, owner_name, database_name, status, plan_code, trial_ends_at)
       VALUES (?, ?, ?, ?, 'PROVISIONING', 'trial', ?)`,
      [slug, businessName, ownerName, databaseName, trialEndsAt]
    )

    const tenantId = tenantResult.insertId

    await connection.query(
      `INSERT INTO platform_accounts
         (tenant_id, username, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, 'Administrador', 'Activo')`,
      [tenantId, username, email, passwordHash]
    )

    await connection.query(
      `INSERT INTO subscriptions
         (tenant_id, plan_code, status, current_period_start, current_period_end)
       VALUES (?, 'trial', 'TRIALING', NOW(), ?)`,
      [tenantId, trialEndsAt]
    )

    await connection.query(
      `INSERT INTO provisioning_jobs (tenant_id, status, attempt_count)
       VALUES (?, 'PENDING', 0)`,
      [tenantId]
    )

    await connection.commit()
    return { tenantId, slug, businessName, databaseName, email, trialEndsAt }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function markProvisioningRunning(tenantId) {
  await getPlatformPool().query(
    `UPDATE tenants SET status = 'PROVISIONING' WHERE id = ?`,
    [tenantId]
  )
  await getPlatformPool().query(
    `UPDATE provisioning_jobs
     SET status = 'RUNNING', attempt_count = attempt_count + 1, started_at = NOW(), error_message = NULL
     WHERE tenant_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [tenantId]
  )
}

export async function markProvisioningCompleted(tenantId) {
  await getPlatformPool().query(
    `UPDATE tenants SET status = 'TRIALING' WHERE id = ?`,
    [tenantId]
  )
  await getPlatformPool().query(
    `UPDATE provisioning_jobs
     SET status = 'COMPLETED', finished_at = NOW()
     WHERE tenant_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [tenantId]
  )
}

export async function markProvisioningFailed(tenantId, errorMessage) {
  await getPlatformPool().query(
    `UPDATE tenants SET status = 'FAILED' WHERE id = ?`,
    [tenantId]
  )
  await getPlatformPool().query(
    `UPDATE provisioning_jobs
     SET status = 'FAILED', finished_at = NOW(), error_message = ?
     WHERE tenant_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [String(errorMessage).slice(0, 4000), tenantId]
  )
}

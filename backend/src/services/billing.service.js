import crypto from 'node:crypto'
import { isSaaSEnabled } from '../config/saas.js'
import { getTenantContext } from '../config/requestContext.js'
import * as PlatformModel from '../models/platform.model.js'
import { ApiError } from '../utils/ApiError.js'

const STRIPE_API = 'https://api.stripe.com/v1'
const WEBHOOK_TOLERANCE_SECONDS = 300

function requireStripeConfig() {
  const missing = ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_ID', 'STRIPE_WEBHOOK_SECRET']
    .filter((key) => !process.env[key]?.trim())
  if (missing.length) {
    throw ApiError.internal(`Facturación no configurada: faltan ${missing.join(', ')}`)
  }
}

function stripeDate(unixSeconds) {
  return unixSeconds ? new Date(Number(unixSeconds) * 1000) : null
}

function mapStripeStatus(status) {
  return {
    trialing: 'TRIALING',
    active: 'ACTIVE',
    past_due: 'PAST_DUE',
    unpaid: 'SUSPENDED',
    incomplete: 'SUSPENDED',
    incomplete_expired: 'CANCELLED',
    canceled: 'CANCELLED',
    paused: 'SUSPENDED',
  }[status] ?? 'SUSPENDED'
}

function getTenantIdFromObject(object) {
  const rawId = object?.metadata?.tenant_id ?? object?.client_reference_id
  const tenantId = Number(rawId)
  return Number.isSafeInteger(tenantId) && tenantId > 0 ? tenantId : null
}

export async function getStatus() {
  if (!isSaaSEnabled()) {
    return { enabled: false, configured: false }
  }

  const tenant = getTenantContext()
  if (!tenant) {
    return { enabled: true, configured: false, legacy: true }
  }

  const record = await PlatformModel.findTenantById(tenant.tenantId)
  return {
    enabled: true,
    configured: Boolean(
      process.env.STRIPE_SECRET_KEY
      && process.env.STRIPE_PRICE_ID
      && process.env.STRIPE_WEBHOOK_SECRET
    ),
    tenant: record ? {
      businessName: record.business_name,
      slug: record.slug,
      status: record.tenant_status,
    } : null,
    subscription: record ? {
      planCode: record.plan_code,
      status: record.subscription_status,
      trialEndsAt: record.trial_ends_at,
      currentPeriodEnd: record.current_period_end,
    } : null,
  }
}

export async function createCheckoutSession() {
  if (!isSaaSEnabled()) throw ApiError.forbidden('La facturación SaaS no está habilitada')
  requireStripeConfig()

  const tenant = getTenantContext()
  if (!tenant) throw ApiError.unauthorized()

  const current = await PlatformModel.findTenantById(tenant.tenantId)
  if (!current) throw ApiError.notFound('Taller no encontrado')
  if (['ACTIVE', 'PAST_DUE'].includes(current.subscription_status)) {
    throw ApiError.conflict('El taller ya tiene una suscripción en curso')
  }

  const owner = await PlatformModel.findTenantOwnerAccount(tenant.tenantId)
  if (!owner) throw ApiError.internal('No se encontró el administrador del taller')

  const successUrl = process.env.BILLING_SUCCESS_URL ?? 'http://localhost:5173/admin/suscripcion?billing=success'
  const cancelUrl = process.env.BILLING_CANCEL_URL ?? 'http://localhost:5173/admin/suscripcion?billing=cancelled'
  const body = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': process.env.STRIPE_PRICE_ID,
    'line_items[0][quantity]': '1',
    customer_email: owner.email,
    client_reference_id: String(tenant.tenantId),
    success_url: successUrl,
    cancel_url: cancelUrl,
    'subscription_data[metadata][tenant_id]': String(tenant.tenantId),
    'subscription_data[metadata][tenant_slug]': current.slug,
  })

  let response
  try {
    response = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: AbortSignal.timeout(15_000),
    })
  } catch (error) {
    throw ApiError.internal(`No fue posible conectar con el proveedor de pagos: ${error.message}`)
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.url) {
    throw ApiError.internal(payload?.error?.message ?? 'El proveedor de pagos rechazó la sesión')
  }

  return { url: payload.url, sessionId: payload.id }
}

export function verifyWebhookSignature(rawBody, signatureHeader) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !rawBody || !signatureHeader) return false

  const parts = String(signatureHeader).split(',').reduce((acc, item) => {
    const [key, value] = item.split('=', 2)
    if (key && value) acc[key] = acc[key] ? `${acc[key]},${value}` : value
    return acc
  }, {})
  const timestamp = Number(parts.t)
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > WEBHOOK_TOLERANCE_SECONDS) {
    return false
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex')
  const signatures = String(parts.v1 ?? '').split(',').filter(Boolean)

  return signatures.some((signature) => {
    const expectedBuffer = Buffer.from(expected, 'utf8')
    const receivedBuffer = Buffer.from(signature, 'utf8')
    return expectedBuffer.length === receivedBuffer.length
      && crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  })
}

export async function handleWebhook(rawBody, signatureHeader) {
  if (!verifyWebhookSignature(rawBody, signatureHeader)) {
    throw ApiError.badRequest('Firma de webhook inválida')
  }

  let event
  try {
    event = JSON.parse(rawBody)
  } catch {
    throw ApiError.badRequest('Webhook inválido')
  }

  const object = event.data?.object
  if (!object) return { received: true, ignored: true }

  if (event.type === 'checkout.session.completed') {
    const tenantId = getTenantIdFromObject(object)
    if (tenantId && object.subscription) {
      await PlatformModel.updateSubscriptionReferences({
        tenantId,
        providerCustomerId: object.customer,
        providerSubscriptionId: object.subscription,
      })
    }
  }

  if (event.type.startsWith('customer.subscription.')) {
    const tenantId = getTenantIdFromObject(object)
    if (tenantId) {
      await PlatformModel.updateSubscription({
        tenantId,
        status: mapStripeStatus(object.status),
        providerCustomerId: object.customer,
        providerSubscriptionId: object.id,
        currentPeriodStart: stripeDate(object.current_period_start),
        currentPeriodEnd: stripeDate(object.current_period_end),
      })
    }
  }

  if (event.type === 'invoice.payment_failed' || event.type === 'invoice.paid') {
    const providerSubscriptionId = object.subscription
    const tenantId = await PlatformModel.findTenantIdByProviderSubscription(providerSubscriptionId)
    if (tenantId) {
      await PlatformModel.updateSubscription({
        tenantId,
        status: event.type === 'invoice.paid' ? 'ACTIVE' : 'PAST_DUE',
        providerCustomerId: object.customer,
        providerSubscriptionId,
      })
    }
  }

  return { received: true }
}

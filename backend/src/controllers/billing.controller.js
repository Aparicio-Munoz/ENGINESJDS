import { ApiResponse } from '../utils/ApiResponse.js'
import * as BillingService from '../services/billing.service.js'

export async function getStatus(_req, res, next) {
  try {
    ApiResponse.success(res, await BillingService.getStatus())
  } catch (err) { next(err) }
}

export async function createCheckout(_req, res, next) {
  try {
    ApiResponse.success(res, await BillingService.createCheckoutSession())
  } catch (err) { next(err) }
}

export async function webhook(req, res, next) {
  try {
    const data = await BillingService.handleWebhook(req.rawBody, req.headers['stripe-signature'])
    ApiResponse.success(res, data)
  } catch (err) { next(err) }
}

import { ApiResponse } from '../utils/ApiResponse.js'
import * as TrackingService from '../services/tracking.service.js'
import { withPublicTenant } from '../middlewares/publicTenant.middleware.js'

export async function getByToken(req, res, next) {
  try {
    const data = await withPublicTenant(req, () => TrackingService.getByToken(req.params.token))
    ApiResponse.success(res, data)
  } catch (err) { next(err) }
}

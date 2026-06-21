import { ApiResponse } from '../utils/ApiResponse.js'
import * as TrackingService from '../services/tracking.service.js'

export async function getByToken(req, res, next) {
  try {
    const data = await TrackingService.getByToken(req.params.token)
    ApiResponse.success(res, data)
  } catch (err) { next(err) }
}

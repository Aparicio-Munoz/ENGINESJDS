import { ApiResponse } from '../utils/ApiResponse.js'
import * as TenantProvisioningService from '../services/tenantProvisioning.service.js'

export async function registerWorkshop(req, res, next) {
  try {
    const result = await TenantProvisioningService.registerWorkshop(req.body)
    ApiResponse.created(
      res,
      result,
      'Taller creado correctamente. Ya puedes iniciar sesión.'
    )
  } catch (error) {
    next(error)
  }
}

import { isSaaSEnabled } from '../config/saas.js'
import { runWithTenantContext } from '../config/requestContext.js'
import * as PlatformModel from '../models/platform.model.js'
import { ApiError } from '../utils/ApiError.js'

// Los enlaces públicos SaaS llevan el slug porque no tienen JWT para
// identificar el taller. Los enlaces antiguos sin slug siguen usando
// exclusivamente la base legacy engines_jds.
export async function withPublicTenant(req, callback) {
  const { tenantSlug } = req.params
  if (!tenantSlug) return callback()
  if (!isSaaSEnabled()) throw ApiError.notFound('No se encontró información con este código de seguimiento')

  const tenant = await PlatformModel.findTenantBySlug(tenantSlug)
  if (!PlatformModel.tenantHasAccess(tenant)) {
    throw ApiError.notFound('No se encontró información con este código de seguimiento')
  }

  return runWithTenantContext({
    tenantId: tenant.id,
    databaseName: tenant.database_name,
    slug: tenant.slug,
  }, callback)
}

import * as EmployeeModel from '../models/employee.model.js'
import * as SearchModel from '../models/search.model.js'
import { ApiError } from '../utils/ApiError.js'

const MAX_RESULTS_PER_GROUP = 5

export async function search({ query, user }) {
  const normalizedQuery = String(query ?? '').trim()
  if (normalizedQuery.length < 2) {
    throw ApiError.badRequest('La búsqueda debe tener al menos 2 caracteres')
  }
  if (normalizedQuery.length > 100) {
    throw ApiError.badRequest('La búsqueda no puede superar 100 caracteres')
  }

  if (user.role === 'Administrador') {
    return SearchModel.findAdministrative(normalizedQuery, MAX_RESULTS_PER_GROUP)
  }

  if (user.role === 'Recepcionista') {
    return SearchModel.findOperational(normalizedQuery, MAX_RESULTS_PER_GROUP)
  }

  if (user.role === 'Técnico') {
    const employee = await EmployeeModel.findByUserId(user.id)
    if (!employee) return { motorcycles: [], orders: [] }
    return SearchModel.findForTechnician(employee.id, normalizedQuery, MAX_RESULTS_PER_GROUP)
  }

  throw ApiError.forbidden()
}

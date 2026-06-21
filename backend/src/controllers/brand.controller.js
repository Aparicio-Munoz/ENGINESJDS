import { ApiResponse } from '../utils/ApiResponse.js'
import * as BrandService from '../services/brand.service.js'

export async function getAll(req, res, next) {
  try {
    const { search, category, status, sort, page, limit } = req.query
    const result = await BrandService.getAll({ search, category, status, sort, page, limit })
    ApiResponse.paginated(res, result.data, result)
  } catch (err) { next(err) }
}

export async function getCategories(_req, res, next) {
  try {
    const categories = await BrandService.getCategories()
    ApiResponse.success(res, categories)
  } catch (err) { next(err) }
}

export async function getById(req, res, next) {
  try {
    const brand = await BrandService.getById(Number(req.params.id))
    ApiResponse.success(res, brand)
  } catch (err) { next(err) }
}

export async function create(req, res, next) {
  try {
    const actor = { userId: req.user.id, userName: req.user.username, role: req.user.role, ip: req.ip }
    const brand = await BrandService.create(req.body, actor)
    ApiResponse.created(res, brand, 'Marca registrada exitosamente')
  } catch (err) { next(err) }
}

export async function update(req, res, next) {
  try {
    const actor = { userId: req.user.id, userName: req.user.username, role: req.user.role, ip: req.ip }
    const brand = await BrandService.update(Number(req.params.id), req.body, actor)
    ApiResponse.success(res, brand, 'Marca actualizada correctamente')
  } catch (err) { next(err) }
}

export async function remove(req, res, next) {
  try {
    const actor = { userId: req.user.id, userName: req.user.username, role: req.user.role, ip: req.ip }
    await BrandService.remove(Number(req.params.id), actor)
    ApiResponse.noContent(res)
  } catch (err) { next(err) }
}

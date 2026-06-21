import * as BrandModel from '../models/brand.model.js'
import { ApiError } from '../utils/ApiError.js'
import { auditEntity, AUDIT_ACTIONS } from './audit.service.js'

export async function getAll({ search, category, status, sort, page = 1, limit = 20 } = {}) {
  const { rows, total } = await BrandModel.findAll({ search, category, status, sort, page, limit })
  return { data: rows, total: Number(total), page: Number(page), limit: Number(limit) }
}

export async function getById(id) {
  const brand = await BrandModel.findById(id)
  if (!brand) throw ApiError.notFound('Marca no encontrada')
  return brand
}

export async function getCategories() {
  return BrandModel.CATEGORIES
}

export async function create({ name, category, price, status }, actor = {}) {
  const trimmed = name.trim()
  if (!trimmed) throw ApiError.badRequest('El nombre de la marca es requerido')
  if (!BrandModel.CATEGORIES.includes(category)) {
    throw ApiError.badRequest(`Categoría inválida — debe ser: ${BrandModel.CATEGORIES.join(', ')}`)
  }
  if (price === undefined || price === null || Number(price) <= 0) {
    throw ApiError.badRequest('El precio debe ser mayor a 0')
  }
  if (await BrandModel.existsInCategory(trimmed, category)) {
    throw ApiError.conflict(`Ya existe una marca "${trimmed}" en la categoría ${category}`)
  }
  const created = await BrandModel.create({ name: trimmed, category, price: Number(price), status })
  await auditEntity(AUDIT_ACTIONS.CREAR_MARCA, {
    actor, tableName: 'brands', recordId: created.id, newValues: created,
    description: `Marca "${created.name}" (${category}) creada`,
  })
  return created
}

export async function update(id, data, actor = {}) {
  const current = await getById(id)

  const nextName     = data.name     !== undefined ? data.name.trim()  : current.name
  const nextCategory = data.category !== undefined ? data.category     : current.category
  const nextPrice    = data.price    !== undefined ? Number(data.price) : Number(current.price)

  if (!nextName) throw ApiError.badRequest('El nombre de la marca no puede estar vacío')
  if (nextPrice <= 0) throw ApiError.badRequest('El precio debe ser mayor a 0')

  if (data.name !== undefined || data.category !== undefined) {
    if (await BrandModel.existsInCategory(nextName, nextCategory, id)) {
      throw ApiError.conflict(`Ya existe una marca "${nextName}" en la categoría ${nextCategory}`)
    }
  }

  const updated = await BrandModel.update(id, {
    name:     data.name !== undefined ? nextName : undefined,
    category: data.category,
    price:    data.price !== undefined ? nextPrice : undefined,
    status:   data.status,
  })
  await auditEntity(AUDIT_ACTIONS.EDITAR_MARCA, {
    actor, tableName: 'brands', recordId: id, oldValues: current, newValues: updated,
    description: `Marca "${updated.name}" editada`,
  })
  return updated
}

export async function remove(id, actor = {}) {
  const brand = await getById(id)
  await BrandModel.remove(id)
  await auditEntity(AUDIT_ACTIONS.ELIMINAR_MARCA, {
    actor, tableName: 'brands', recordId: id, oldValues: brand,
    description: `Marca "${brand.name}" (${brand.category}) eliminada`,
  })
}

// ── Público ──────────────────────────────────────────────────
export async function getPublicBrands(category = null) {
  const rows = await BrandModel.findActiveByCategory(category)
  const grouped = {}
  for (const row of rows) {
    if (!grouped[row.category]) grouped[row.category] = []
    grouped[row.category].push({ id: row.id, name: row.name, price: row.price })
  }
  return grouped
}

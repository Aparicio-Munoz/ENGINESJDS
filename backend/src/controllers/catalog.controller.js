import { ApiResponse } from '../utils/ApiResponse.js'
import * as BrandService from '../services/brand.service.js'
import * as InventoryModel from '../models/inventory.model.js'

// GET /api/public/brands?category=
//   Marcas activas agrupadas por categoría — { categoria: [{ id, name }] }
export async function getBrands(req, res, next) {
  try {
    const { category } = req.query
    const grouped = await BrandService.getPublicBrands(category || null)
    ApiResponse.success(res, grouped)
  } catch (err) { next(err) }
}

// GET /api/public/products?brand=&category=
//   Productos disponibles (stock > 0) — campos públicos sin costo ni proveedor
export async function getProducts(req, res, next) {
  try {
    const { brand, category } = req.query
    const products = await InventoryModel.findPublicProducts({ brand, category })
    ApiResponse.success(res, products)
  } catch (err) { next(err) }
}

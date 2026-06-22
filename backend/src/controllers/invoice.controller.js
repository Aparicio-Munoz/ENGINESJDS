import { ApiResponse } from '../utils/ApiResponse.js'
import * as InvoiceService from '../services/invoice.service.js'

function buildActor(req) {
  return { userId: req.user.id, userName: req.user.username, role: req.user.role, ip: req.ip }
}

export async function getAll(req, res, next) {
  try {
    const result = await InvoiceService.getAll(req.query)
    ApiResponse.paginated(res, result.data, result)
  } catch (err) { next(err) }
}

export async function getById(req, res, next) {
  try {
    const inv = await InvoiceService.getById(Number(req.params.id))
    ApiResponse.success(res, inv)
  } catch (err) { next(err) }
}

export async function create(req, res, next) {
  try {
    const inv = await InvoiceService.create(req.body, buildActor(req))
    ApiResponse.created(res, inv, 'Factura creada exitosamente')
  } catch (err) { next(err) }
}

export async function markPaid(req, res, next) {
  try {
    const inv = await InvoiceService.markPaid(Number(req.params.id), buildActor(req))
    ApiResponse.success(res, inv, 'Factura marcada como pagada')
  } catch (err) { next(err) }
}

export async function cancel(req, res, next) {
  try {
    const inv = await InvoiceService.cancel(Number(req.params.id), buildActor(req))
    ApiResponse.success(res, inv, 'Factura anulada')
  } catch (err) { next(err) }
}

export async function getPDF(req, res, next) {
  try {
    const { buffer, filename } = await InvoiceService.generatePDF(Number(req.params.id), buildActor(req))
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${filename}"`, 'Content-Length': buffer.length })
    res.send(buffer)
  } catch (err) { next(err) }
}

export async function getDailySummary(req, res, next) {
  try {
    const data = await InvoiceService.getDailySummary(req.query.date || null)
    ApiResponse.success(res, data)
  } catch (err) { next(err) }
}

import * as InvoiceModel from '../models/invoice.model.js'
import * as OrderModel from '../models/order.model.js'
import { ApiError } from '../utils/ApiError.js'
import { logAudit } from './audit.service.js'
import PDFDocument from 'pdfkit'

export async function getAll(query) {
  const { rows, total } = await InvoiceModel.findAll(query)
  return { data: rows, total, page: Number(query.page || 1), limit: Number(query.limit || 20) }
}

export async function getById(id) {
  const inv = await InvoiceModel.findById(id)
  if (!inv) throw ApiError.notFound('Factura no encontrada')
  return inv
}

export async function create({ order_id, payment_method, notes }, actor = {}) {
  const order = await OrderModel.findById(order_id)
  if (!order) throw ApiError.notFound('Orden no encontrada')

  if (await InvoiceModel.existsForOrder(order_id)) {
    throw ApiError.conflict('Ya existe una factura activa para esta orden')
  }

  const subtotal = Number(order.subtotal) || (Number(order.labor_cost) + Number(order.parts_cost))
  const discount = Number(order.discount) || 0
  const total = subtotal - discount
  const clientName = `${order.client_name ?? ''} ${order.client_last_name ?? ''}`.trim()

  const invoice = await InvoiceModel.create({
    order_id,
    subtotal,
    discount,
    tax: 0,
    total,
    payment_method: payment_method || 'Efectivo',
    notes,
    created_by: actor.userId ?? null,
    client_name: clientName,
    client_document: order.document ?? null,
  })

  await logAudit('CREATE_INVOICE', {
    userId: actor.userId, userName: actor.userName, role: actor.role, ipAddress: actor.ip,
    tableName: 'invoices', recordId: invoice.id,
    description: `Factura ${invoice.invoice_number} creada — ${fmtCOP(total)}`,
  })

  return invoice
}

export async function markPaid(id, actor = {}) {
  const inv = await getById(id)
  if (inv.status === 'Pagada') throw ApiError.conflict('La factura ya está pagada')
  if (inv.status === 'Anulada') throw ApiError.conflict('No se puede pagar una factura anulada')

  const updated = await InvoiceModel.markPaid(id)
  await logAudit('PAY_INVOICE', {
    userId: actor.userId, userName: actor.userName, role: actor.role, ipAddress: actor.ip,
    tableName: 'invoices', recordId: id,
    description: `Factura ${inv.invoice_number} marcada como pagada`,
  })
  return updated
}

export async function cancel(id, actor = {}) {
  const inv = await getById(id)
  if (inv.status === 'Anulada') throw ApiError.conflict('La factura ya está anulada')

  const updated = await InvoiceModel.markCancelled(id)
  await logAudit('CANCEL_INVOICE', {
    userId: actor.userId, userName: actor.userName, role: actor.role, ipAddress: actor.ip,
    tableName: 'invoices', recordId: id,
    description: `Factura ${inv.invoice_number} anulada`,
  })
  return updated
}

export async function getDailySummary(date) {
  return InvoiceModel.getDailySummary(date)
}

export async function generatePDF(id, actor = {}) {
  const inv = await getById(id)
  const services = await InvoiceModel.getServices(inv.order_id)
  const parts = await InvoiceModel.getParts(inv.order_id)

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 })
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', async () => {
      await logAudit('DOWNLOAD_INVOICE', {
        userId: actor.userId, userName: actor.userName, role: actor.role, ipAddress: actor.ip,
        tableName: 'invoices', recordId: id,
        description: `PDF factura ${inv.invoice_number} generado`,
      })
      resolve({ buffer: Buffer.concat(chunks), filename: `${inv.invoice_number}.pdf` })
    })
    doc.on('error', reject)

    const pw = doc.page.width - 100

    // Header
    doc.fontSize(18).fillColor('#F97316').text('ENGINES JDS', 50, 40)
    doc.fontSize(9).fillColor('#64748B').text('Taller especializado en motocicletas', 50, 62)
    doc.moveDown(1.5)

    // Invoice number + status
    doc.fontSize(14).fillColor('#0F172A').text(`FACTURA ${inv.invoice_number}`)
    const stColor = inv.status === 'Pagada' ? '#059669' : inv.status === 'Anulada' ? '#DC2626' : '#D97706'
    doc.fontSize(10).fillColor(stColor).text(`Estado: ${inv.status}`)
    doc.moveDown(0.8)

    // Client
    doc.fontSize(10).fillColor('#F97316').text('CLIENTE')
    doc.fontSize(9).fillColor('#0F172A').text(inv.client_name || '—')
    if (inv.client_document || inv.c_document) doc.fillColor('#64748B').text(`Doc: ${inv.client_document || inv.c_document}`)
    if (inv.c_phone) doc.fillColor('#64748B').text(`Tel: ${inv.c_phone}`)
    doc.moveDown(0.5)

    // Motorcycle
    doc.fontSize(10).fillColor('#F97316').text('MOTOCICLETA')
    doc.fontSize(9).fillColor('#0F172A').text(`${inv.plate ?? '—'} — ${inv.brand ?? ''} ${inv.model ?? ''} ${inv.year ?? ''}`)
    doc.moveDown(0.5)

    // Order
    doc.fontSize(10).fillColor('#F97316').text(`ORDEN: ${inv.order_number}`)
    doc.moveDown(0.5)

    // Services
    if (services.length) {
      doc.fontSize(9).fillColor('#64748B').text('Servicios:')
      for (const s of services) {
        doc.fillColor('#0F172A').text(`  ${s.service_name}  x${s.quantity}  ${fmtCOP(s.total_price)}`)
      }
      doc.moveDown(0.3)
    }

    // Parts
    if (parts.length) {
      doc.fontSize(9).fillColor('#64748B').text('Repuestos:')
      for (const p of parts) {
        doc.fillColor('#0F172A').text(`  ${p.part_name}  x${p.quantity}  ${fmtCOP(p.total_price)}`)
      }
      doc.moveDown(0.3)
    }

    // Totals
    doc.moveDown(0.5)
    doc.fontSize(9).fillColor('#0F172A').text(`Subtotal: ${fmtCOP(inv.subtotal)}`)
    if (Number(inv.discount) > 0) doc.fillColor('#059669').text(`Descuento: - ${fmtCOP(inv.discount)}`)
    doc.moveDown(0.2)
    doc.fontSize(13).fillColor('#0F172A').text(`TOTAL: ${fmtCOP(inv.total)}`)
    doc.moveDown(0.5)

    doc.fontSize(9).fillColor('#64748B').text(`Método: ${inv.payment_method}`)
    doc.text(`Fecha: ${new Date(inv.created_at).toLocaleString('es-CO')}`)
    if (inv.paid_at) doc.text(`Pagada: ${new Date(inv.paid_at).toLocaleString('es-CO')}`)

    // Footer
    doc.fontSize(8).fillColor('#94A3B8').text('ENGINES JDS — Gracias por su preferencia', 50, doc.page.height - 60, { width: pw, align: 'center' })

    doc.end()
  })
}

function fmtCOP(n) {
  return `$ ${Math.round(Number(n || 0)).toLocaleString('es-CO')}`
}

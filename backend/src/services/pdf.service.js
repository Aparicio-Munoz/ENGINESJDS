import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import * as OrderModel from '../models/order.model.js'
import { ApiError } from '../utils/ApiError.js'

const TRACKING_BASE = process.env.TRACKING_BASE_URL ?? 'https://enginesjds.com/tracking'
const WHATSAPP_NUMBER = '573183531500'

const ORANGE = '#F97316'
const DARK   = '#0F172A'
const MUTED  = '#64748B'
const LIGHT  = '#94A3B8'
const LINE   = '#E2E8F0'

function fmtCOP(n) {
  if (n === null || n === undefined) return '$ 0'
  return `$ ${Math.round(Number(n)).toLocaleString('es-CO')}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export async function generateOrderPDF(orderId) {
  const history = await OrderModel.findHistory(orderId)
  if (!history) throw ApiError.notFound('Orden de trabajo no encontrada')

  const o = history.order
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 40, bottom: 40, left: 50, right: 50 } })
  const chunks = []
  doc.on('data', (c) => chunks.push(c))

  const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right

  // ── Header ─────────────────────────────────────────
  doc.fontSize(20).fillColor(ORANGE).text('◈', { continued: true })
  doc.fillColor(DARK).text(`  ENGINES JDS`, { continued: false })
  doc.moveDown(0.2)
  doc.fontSize(9).fillColor(MUTED).text('Taller especializado en motocicletas')
  doc.moveDown(0.5)

  // Title bar
  doc.rect(doc.x, doc.y, pageW, 28).fill(DARK)
  doc.fillColor('#FFFFFF').fontSize(12).text(
    `ORDEN DE TRABAJO  ${o.order_number}`,
    doc.page.margins.left + 10, doc.y - 20,
    { width: pageW - 20 }
  )
  doc.moveDown(1)

  const leftCol = doc.page.margins.left
  const colW = (pageW - 20) / 2

  // ── Cliente ────────────────────────────────────────
  const clientY = doc.y
  doc.fontSize(10).fillColor(ORANGE).text('CLIENTE', leftCol, clientY)
  doc.moveDown(0.3)
  doc.fontSize(9).fillColor(DARK)
  doc.text(`${o.client_name ?? ''} ${o.client_last_name ?? ''}`)
  doc.fillColor(MUTED)
  doc.text(`${o.document_type ?? 'CC'}: ${o.document ?? '—'}`)
  doc.text(`Tel: ${o.client_phone ?? '—'}`)
  if (o.client_email) doc.text(`Email: ${o.client_email}`)

  // ── Motocicleta ────────────────────────────────────
  const motoX = leftCol + colW + 20
  doc.fontSize(10).fillColor(ORANGE).text('MOTOCICLETA', motoX, clientY)
  doc.fontSize(9).fillColor(DARK).text(`${o.brand ?? ''} ${o.model ?? ''} ${o.year ?? ''}`, motoX)
  doc.fillColor(MUTED)
  doc.text(`Placa: ${o.plate ?? '—'}`, motoX)
  doc.text(`Color: ${o.color ?? '—'} · ${o.engine_cc ? o.engine_cc + 'cc' : '—'}`, motoX)
  if (o.vin) doc.text(`VIN: ${o.vin}`, motoX)

  doc.y = Math.max(doc.y, clientY + 80)
  doc.moveDown(0.5)

  // Separator
  doc.moveTo(leftCol, doc.y).lineTo(leftCol + pageW, doc.y).strokeColor(LINE).lineWidth(0.5).stroke()
  doc.moveDown(0.5)

  // ── Estado + Fechas ────────────────────────────────
  const statusY = doc.y
  doc.fontSize(10).fillColor(ORANGE).text('ESTADO', leftCol, statusY)
  doc.moveDown(0.3)
  doc.fontSize(11).fillColor(DARK).text(o.status ?? '—')

  doc.fontSize(10).fillColor(ORANGE).text('FECHAS', motoX, statusY)
  doc.fontSize(9).fillColor(MUTED)
  doc.text(`Ingreso: ${fmtDate(o.entry_date)}`, motoX)
  doc.text(`Entrega estimada: ${fmtDate(o.estimated_delivery_date)}`, motoX)
  if (o.actual_delivery_date) doc.text(`Entregada: ${fmtDate(o.actual_delivery_date)}`, motoX)

  doc.y = Math.max(doc.y, statusY + 55)
  doc.moveDown(0.5)

  // ── Técnico ────────────────────────────────────────
  if (o.employee_name) {
    doc.fontSize(10).fillColor(ORANGE).text('TÉCNICO ASIGNADO', leftCol)
    doc.moveDown(0.2)
    doc.fontSize(9).fillColor(DARK).text(`${o.employee_name}${o.employee_specialty ? ` — ${o.employee_specialty}` : ''}`)
    doc.moveDown(0.5)
  }

  // ── Diagnóstico ────────────────────────────────────
  if (o.diagnostic_notes) {
    doc.moveTo(leftCol, doc.y).lineTo(leftCol + pageW, doc.y).strokeColor(LINE).stroke()
    doc.moveDown(0.5)
    doc.fontSize(10).fillColor(ORANGE).text('DIAGNÓSTICO')
    doc.moveDown(0.3)
    doc.fontSize(9).fillColor(DARK).text(o.diagnostic_notes, { width: pageW, lineGap: 2 })
    doc.moveDown(0.5)
  }

  // ── Servicios ──────────────────────────────────────
  if (history.services.length > 0) {
    doc.moveTo(leftCol, doc.y).lineTo(leftCol + pageW, doc.y).strokeColor(LINE).stroke()
    doc.moveDown(0.5)
    doc.fontSize(10).fillColor(ORANGE).text('SERVICIOS REALIZADOS')
    doc.moveDown(0.3)

    for (const svc of history.services) {
      doc.fontSize(9).fillColor(DARK)
      doc.text(`✓  ${svc.service_name}`, leftCol + 5, doc.y, { continued: true, width: pageW * 0.65 })
      doc.fillColor(MUTED).text(`  x${svc.quantity} — ${fmtCOP(svc.total_price)}`, { align: 'right' })
    }
    doc.moveDown(0.5)
  }

  // ── Repuestos ──────────────────────────────────────
  if (history.parts.length > 0) {
    doc.moveTo(leftCol, doc.y).lineTo(leftCol + pageW, doc.y).strokeColor(LINE).stroke()
    doc.moveDown(0.5)
    doc.fontSize(10).fillColor(ORANGE).text('REPUESTOS UTILIZADOS')
    doc.moveDown(0.3)

    for (const part of history.parts) {
      doc.fontSize(9).fillColor(DARK)
      doc.text(`•  ${part.part_name}`, leftCol + 5, doc.y, { continued: true, width: pageW * 0.65 })
      doc.fillColor(MUTED).text(`  x${part.quantity} — ${fmtCOP(part.total_price)}`, { align: 'right' })
    }
    doc.moveDown(0.5)
  }

  // ── Totales ────────────────────────────────────────
  doc.moveTo(leftCol, doc.y).lineTo(leftCol + pageW, doc.y).strokeColor(LINE).stroke()
  doc.moveDown(0.5)

  const totalsX = leftCol + pageW - 200
  doc.fontSize(9).fillColor(MUTED)
  doc.text('Mano de obra:', totalsX, doc.y, { continued: true, width: 120 })
  doc.fillColor(DARK).text(fmtCOP(o.labor_cost), { align: 'right' })
  doc.fillColor(MUTED).text('Repuestos:', totalsX, doc.y, { continued: true, width: 120 })
  doc.fillColor(DARK).text(fmtCOP(o.parts_cost), { align: 'right' })
  if (Number(o.discount) > 0) {
    doc.fillColor(MUTED).text('Descuento:', totalsX, doc.y, { continued: true, width: 120 })
    doc.fillColor('#059669').text(`- ${fmtCOP(o.discount)}`, { align: 'right' })
  }
  doc.moveDown(0.3)
  doc.rect(totalsX, doc.y, 200, 24).fill(DARK)
  doc.fillColor('#FFFFFF').fontSize(11).text(
    `TOTAL:  ${fmtCOP(o.final_price)}`,
    totalsX + 10, doc.y - 18,
    { width: 180, align: 'right' }
  )
  doc.moveDown(1.5)

  // ── QR Code ────────────────────────────────────────
  if (o.tracking_token) {
    const trackingUrl = `${TRACKING_BASE}/${o.tracking_token}`
    try {
      const qrDataUrl = await QRCode.toDataURL(trackingUrl, { width: 100, margin: 1 })
      const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64')

      const qrY = doc.y
      doc.image(qrBuffer, leftCol, qrY, { width: 80 })
      doc.fontSize(8).fillColor(MUTED)
        .text('Escanea para ver el estado', leftCol, qrY + 82, { width: 80, align: 'center' })
      doc.fontSize(7).fillColor(LIGHT)
        .text(trackingUrl, leftCol, qrY + 94, { width: 160 })
    } catch { /* QR generation failed — skip silently */ }
  }

  // ── Footer ─────────────────────────────────────────
  const footerY = doc.page.height - doc.page.margins.bottom - 30
  doc.moveTo(leftCol, footerY).lineTo(leftCol + pageW, footerY).strokeColor(LINE).lineWidth(0.5).stroke()
  doc.fontSize(8).fillColor(MUTED)
  doc.text('Gracias por confiar en ENGINES JDS', leftCol, footerY + 6, { width: pageW, align: 'center' })
  doc.text(`WhatsApp: +57 ${WHATSAPP_NUMBER.slice(2)}  ·  www.enginesjds.com`, { width: pageW, align: 'center' })

  doc.end()

  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve({
        buffer: Buffer.concat(chunks),
        filename: `OT_${o.order_number}.pdf`,
      })
    })
  })
}

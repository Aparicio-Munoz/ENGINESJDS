import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import * as HistoryModel from '../models/history.model.js'
import { ApiError } from '../utils/ApiError.js'
import { logAudit } from './audit.service.js'

const TRACKING_BASE = process.env.TRACKING_BASE_URL ?? 'https://enginesjds.com/tracking'

export async function getFullHistory(motorcycleId, actor = {}) {
  const motorcycle = await HistoryModel.getMotorcycleInfo(motorcycleId)
  if (!motorcycle) throw ApiError.notFound('Motocicleta no encontrada')

  const [stats, timeline, services, parts, yearlyCosts] = await Promise.all([
    HistoryModel.getStats(motorcycleId),
    HistoryModel.getTimeline(motorcycleId),
    HistoryModel.getServicesHistory(motorcycleId),
    HistoryModel.getPartsHistory(motorcycleId),
    HistoryModel.getYearlyCosts(motorcycleId),
  ])

  await logAudit('VIEW_HISTORY', {
    userId: actor.userId, userName: actor.userName, role: actor.role, ipAddress: actor.ip,
    tableName: 'motorcycles', recordId: motorcycleId,
    description: `Historial clínico de ${motorcycle.plate} consultado`,
  })

  return { motorcycle, stats, timeline, services, parts, yearlyCosts }
}

export async function getStats(motorcycleId) {
  const moto = await HistoryModel.getMotorcycleInfo(motorcycleId)
  if (!moto) throw ApiError.notFound('Motocicleta no encontrada')
  return HistoryModel.getStats(motorcycleId)
}

export async function getTimeline(motorcycleId) {
  const moto = await HistoryModel.getMotorcycleInfo(motorcycleId)
  if (!moto) throw ApiError.notFound('Motocicleta no encontrada')
  return HistoryModel.getTimeline(motorcycleId)
}

function fmtCOP(n) {
  return `$ ${Math.round(Number(n || 0)).toLocaleString('es-CO')}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export async function generatePDF(motorcycleId, actor = {}) {
  const motorcycle = await HistoryModel.getMotorcycleInfo(motorcycleId)
  if (!motorcycle) throw ApiError.notFound('Motocicleta no encontrada')

  const [stats, timeline, services] = await Promise.all([
    HistoryModel.getStats(motorcycleId),
    HistoryModel.getTimeline(motorcycleId),
    HistoryModel.getServicesHistory(motorcycleId),
  ])

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 })
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', async () => {
      await logAudit('DOWNLOAD_HISTORY_PDF', {
        userId: actor.userId, userName: actor.userName, role: actor.role, ipAddress: actor.ip,
        tableName: 'motorcycles', recordId: motorcycleId,
        description: `PDF historial ${motorcycle.plate} generado`,
      })
      resolve({ buffer: Buffer.concat(chunks), filename: `Historial_${motorcycle.plate}.pdf` })
    })
    doc.on('error', reject)

    // Header
    doc.fontSize(18).fillColor('#F97316').text('ENGINES JDS', 50, 40)
    doc.fontSize(9).fillColor('#64748B').text('Historial clínico de motocicleta', 50, 62)
    doc.moveDown(1.5)

    // Motorcycle info
    doc.fontSize(16).fillColor('#0F172A').text(`${motorcycle.plate}`)
    doc.fontSize(11).fillColor('#64748B').text(`${motorcycle.brand} ${motorcycle.model} ${motorcycle.year} — ${motorcycle.color ?? ''} ${motorcycle.engine_cc ? motorcycle.engine_cc + 'cc' : ''}`)
    doc.fontSize(9).text(`Cliente: ${motorcycle.client_name ?? 'Sin propietario asignado'} · Tel: ${motorcycle.client_phone ?? '—'}`)
    doc.moveDown(0.8)

    // Stats
    doc.fontSize(10).fillColor('#F97316').text('ESTADÍSTICAS')
    doc.fontSize(9).fillColor('#0F172A')
    doc.text(`Visitas: ${stats.totalVisits} · Total invertido: ${fmtCOP(stats.totalSpent)} · Promedio: ${fmtCOP(stats.averageSpent)}`)
    doc.text(`Servicio más frecuente: ${stats.favoriteService ?? '—'} · Última visita: ${fmtDate(stats.lastVisit)}`)
    doc.moveDown(0.8)

    // Timeline
    doc.fontSize(10).fillColor('#F97316').text('HISTORIAL DE VISITAS')
    doc.moveDown(0.3)
    for (const entry of timeline) {
      doc.fontSize(9).fillColor('#0F172A').text(`${entry.order_number} — ${fmtDate(entry.entry_date)} — ${entry.order_status} — ${fmtCOP(entry.final_price)}`)
      if (entry.technician_name) doc.fillColor('#64748B').text(`  Técnico: ${entry.technician_name}`)
      if (entry.diagnostic_notes) doc.fillColor('#64748B').text(`  Diagnóstico: ${entry.diagnostic_notes.substring(0, 120)}`)
      doc.moveDown(0.2)
    }

    if (!timeline.length) doc.fontSize(9).fillColor('#64748B').text('Sin visitas registradas.')

    // Footer
    doc.fontSize(8).fillColor('#94A3B8').text('ENGINES JDS — Historial clínico de motocicleta', 50, doc.page.height - 60, { width: doc.page.width - 100, align: 'center' })

    doc.end()
  })
}

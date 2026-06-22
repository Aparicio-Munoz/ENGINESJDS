import { ApiResponse } from '../utils/ApiResponse.js'
import * as HistoryService from '../services/history.service.js'

function buildActor(req) {
  return { userId: req.user?.id, userName: req.user?.username, role: req.user?.role, ip: req.ip }
}

export async function getFullHistory(req, res, next) {
  try {
    const data = await HistoryService.getFullHistory(Number(req.params.id), buildActor(req))
    ApiResponse.success(res, data)
  } catch (err) { next(err) }
}

export async function getStats(req, res, next) {
  try {
    const data = await HistoryService.getStats(Number(req.params.id))
    ApiResponse.success(res, data)
  } catch (err) { next(err) }
}

export async function getTimeline(req, res, next) {
  try {
    const data = await HistoryService.getTimeline(Number(req.params.id))
    ApiResponse.success(res, data)
  } catch (err) { next(err) }
}

export async function getPDF(req, res, next) {
  try {
    const { buffer, filename } = await HistoryService.generatePDF(Number(req.params.id), buildActor(req))
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${filename}"`, 'Content-Length': buffer.length })
    res.send(buffer)
  } catch (err) { next(err) }
}

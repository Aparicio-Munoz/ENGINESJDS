import { Server } from 'socket.io'
import { logger } from '../utils/logger.js'

let io = null

function getAllowedOrigins() {
  const raw = process.env.FRONTEND_URL ?? 'http://localhost:5173'
  return raw.split(',').map((s) => s.trim())
}

export function initSocket(httpServer) {
  const allowedOrigins = getAllowedOrigins()

  io = new Server(httpServer, {
    cors: {
      origin(origin, cb) {
        if (!origin) return cb(null, true)
        if (allowedOrigins.includes(origin)) return cb(null, true)
        if (process.env.NODE_ENV !== 'production' && (
          origin.includes('://192.168.') ||
          origin.includes('://10.') ||
          origin.includes('://172.') ||
          origin.includes('://localhost')
        )) {
          return cb(null, true)
        }
        cb(null, false)
      },
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`)

    socket.on('join-tracking', (token) => {
      if (token) socket.join(`tracking:${token}`)
    })

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (${reason})`)
    })
  })

  return io
}

export function getIO() {
  return io
}

export function emit(event, data) {
  if (io) io.emit(event, data)
}

export function emitToTracking(token, event, data) {
  if (io && token) io.to(`tracking:${token}`).emit(event, data)
}

export const EVENTS = {
  ORDER_CREATED:        'ORDER_CREATED',
  ORDER_STATUS_CHANGED: 'ORDER_STATUS_CHANGED',
  TRACKING_UPDATED:     'TRACKING_UPDATED',
  INVOICE_PAID:         'INVOICE_PAID',
  CRM_REMINDER_SENT:    'CRM_REMINDER_SENT',
  LOW_STOCK_ALERT:      'LOW_STOCK_ALERT',
  DASHBOARD_REFRESH:    'DASHBOARD_REFRESH',
}

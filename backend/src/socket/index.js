import { Server } from 'socket.io'
import { logger } from '../utils/logger.js'

let io = null

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
    transports: ['websocket', 'polling'],
  })

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`)

    socket.on('join-tracking', (token) => {
      if (token) socket.join(`tracking:${token}`)
    })

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`)
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

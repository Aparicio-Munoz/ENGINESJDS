import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useToast } from '../hooks/useToast'

const SocketContext = createContext(null)

const EVENTS = {
  ORDER_CREATED:        'ORDER_CREATED',
  ORDER_STATUS_CHANGED: 'ORDER_STATUS_CHANGED',
  TRACKING_UPDATED:     'TRACKING_UPDATED',
  INVOICE_PAID:         'INVOICE_PAID',
  CRM_REMINDER_SENT:    'CRM_REMINDER_SENT',
  LOW_STOCK_ALERT:      'LOW_STOCK_ALERT',
  DASHBOARD_REFRESH:    'DASHBOARD_REFRESH',
}

function resolveSocketURL() {
  const { protocol, hostname } = window.location
  return `${protocol}//${hostname}:3000`
}

export function SocketProvider({ children }) {
  const toast = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const socketRef = useRef(null)
  const [notifications, setNotifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem('engines-notifications') ?? '[]') } catch { return [] }
  })
  const [refreshKey, setRefreshKey] = useState(0)

  const addNotification = useCallback((notif) => {
    const entry = { ...notif, id: Date.now(), time: new Date().toISOString(), read: false }
    setNotifications((prev) => {
      const next = [entry, ...prev].slice(0, 50)
      localStorage.setItem('engines-notifications', JSON.stringify(next))
      return next
    })
  }, [])

  useEffect(() => {
    const socket = io(resolveSocketURL(), { transports: ['websocket', 'polling'], reconnection: true })
    socketRef.current = socket

    socket.on(EVENTS.ORDER_CREATED, (data) => {
      toastRef.current.success(`Nueva orden: ${data.order_number}`)
      addNotification({ type: 'order', title: 'Nueva orden', message: `${data.order_number} — ${data.client}` })
      setRefreshKey((k) => k + 1)
    })

    socket.on(EVENTS.ORDER_STATUS_CHANGED, (data) => {
      toastRef.current.success(`${data.order_number}: ${data.previousStatus} → ${data.newStatus}`)
      addNotification({ type: 'status', title: 'Estado actualizado', message: `${data.order_number} → ${data.newStatus}` })
      setRefreshKey((k) => k + 1)
    })

    socket.on(EVENTS.INVOICE_PAID, (data) => {
      toastRef.current.success(`Factura ${data.invoice_number} pagada`)
      addNotification({ type: 'invoice', title: 'Factura pagada', message: `${data.invoice_number} — $${Number(data.total).toLocaleString('es-CO')}` })
      setRefreshKey((k) => k + 1)
    })

    socket.on(EVENTS.LOW_STOCK_ALERT, (data) => {
      toastRef.current.error(`Stock bajo: ${data.product} (${data.stock} uds)`)
      addNotification({ type: 'alert', title: 'Stock bajo', message: `${data.product}: ${data.stock} / ${data.minimum_stock}` })
    })

    socket.on(EVENTS.CRM_REMINDER_SENT, (data) => {
      toastRef.current.success(`Recordatorio enviado a ${data.client}`)
      addNotification({ type: 'crm', title: 'Recordatorio enviado', message: `${data.client} — ${data.type}` })
    })

    socket.on(EVENTS.DASHBOARD_REFRESH, () => {
      setRefreshKey((k) => k + 1)
    })

    return () => { socket.disconnect() }
  }, [addNotification])

  const joinTracking = useCallback((token) => {
    socketRef.current?.emit('join-tracking', token)
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }))
      localStorage.setItem('engines-notifications', JSON.stringify(next))
      return next
    })
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
    localStorage.removeItem('engines-notifications')
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      notifications, unreadCount, refreshKey,
      joinTracking, markAllRead, clearNotifications,
      EVENTS,
    }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { ordersApi } from '../api/ordersApi'
import { inventoryApi } from '../api/inventoryApi'
import { invoicesApi } from '../api/invoicesApi'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../hooks/useAuth'

import { SocketContext } from './SocketContextValue'
const NOTIFICATIONS_KEY = 'engines-notifications'
const POLL_INTERVAL_MS = 25000

// Sustituye a los eventos de Socket.IO — ahora se sintetizan comparando
// snapshots sucesivos de los mismos endpoints REST que ya usa el resto de la app.
const EVENTS = {
  ORDER_CREATED:        'ORDER_CREATED',
  ORDER_STATUS_CHANGED: 'ORDER_STATUS_CHANGED',
  INVOICE_PAID:         'INVOICE_PAID',
  LOW_STOCK_ALERT:      'LOW_STOCK_ALERT',
}

export function SocketProvider({ children }) {
  const { isAuthenticated, user } = useAuth()
  const isAdmin = user?.role === 'Administrador'
  const toast = useToast()
  const toastRef = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])

  const [notifications, setNotifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) ?? '[]') } catch { return [] }
  })

  // null = todavía no se tomó una primera foto (evita notificar todo el estado inicial)
  const ordersSnapshotRef  = useRef(null)
  const alertsSnapshotRef  = useRef(null)
  const invoicesPaidRef    = useRef(null)

  const addNotification = useCallback((notif) => {
    const entry = {
      ...notif,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: new Date().toISOString(),
      read: false,
    }
    setNotifications((prev) => {
      const next = [entry, ...prev].slice(0, 50)
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const pollOrders = useCallback(async () => {
    const orders = await ordersApi.getActive()
    const previous = ordersSnapshotRef.current
    const snapshot = new Map(orders.map((o) => [o.id, o.status]))

    if (previous) {
      for (const order of orders) {
        const prevStatus = previous.get(order.id)
        if (prevStatus === undefined) {
          toastRef.current.success(`Nueva orden: ${order.order_number}`)
          addNotification({
            type: 'order', title: 'Nueva orden',
            message: `${order.order_number} — ${order.client_name ?? ''}`.trim(),
          })
        } else if (prevStatus !== order.status) {
          toastRef.current.success(`${order.order_number}: ${prevStatus} → ${order.status}`)
          addNotification({
            type: 'status', title: 'Estado actualizado',
            message: `${order.order_number} → ${order.status}`,
          })
        }
      }
    }
    ordersSnapshotRef.current = snapshot
  }, [addNotification])

  const pollInventoryAlerts = useCallback(async () => {
    const alerts = await inventoryApi.getAlerts()
    const previous = alertsSnapshotRef.current
    const snapshot = new Set(alerts.map((a) => a.id))

    if (previous) {
      for (const alert of alerts) {
        if (!previous.has(alert.id)) {
          toastRef.current.error(`Stock bajo: ${alert.name} (${alert.quantity} uds)`)
          addNotification({
            type: 'alert', title: 'Stock bajo',
            message: `${alert.name}: ${alert.quantity} / ${alert.min_stock}`,
          })
        }
      }
    }
    alertsSnapshotRef.current = snapshot
  }, [addNotification])

  const pollInvoices = useCallback(async () => {
    const summary = await invoicesApi.getDailySummary()
    const previous = invoicesPaidRef.current
    if (previous != null && summary.totalPaid > previous) {
      const delta = summary.totalPaid - previous
      toastRef.current.success(`Factura pagada: +$${delta.toLocaleString('es-CO')}`)
      addNotification({
        type: 'invoice', title: 'Factura pagada',
        message: `+$${delta.toLocaleString('es-CO')}`,
      })
    }
    invoicesPaidRef.current = summary.totalPaid
  }, [addNotification])

  useEffect(() => {
    if (!isAuthenticated) {
      ordersSnapshotRef.current = null
      alertsSnapshotRef.current = null
      invoicesPaidRef.current = null
      return
    }

    let cancelled = false
    let timer = null

    async function tick() {
      try { await pollOrders() } catch { /* red intermitente — se reintenta en el siguiente ciclo */ }
      // Inventario y facturas son endpoints solo-Administrador (requireRole en backend)
      if (isAdmin) {
        try { await pollInventoryAlerts() } catch { /* idem */ }
        try { await pollInvoices() } catch { /* idem */ }
      }
      if (!cancelled) timer = setTimeout(tick, POLL_INTERVAL_MS)
    }

    tick()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [isAuthenticated, isAdmin, pollOrders, pollInventoryAlerts, pollInvoices])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }))
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
    localStorage.removeItem(NOTIFICATIONS_KEY)
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <SocketContext.Provider value={{
      notifications, unreadCount,
      markAllRead, clearNotifications,
      EVENTS,
    }}>
      {children}
    </SocketContext.Provider>
  )
}

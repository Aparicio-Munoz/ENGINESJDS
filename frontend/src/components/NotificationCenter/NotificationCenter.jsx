import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getInventory } from '../../services/inventoryService'
import { getOrders } from '../../services/ordersService'
import { getAppointments } from '../../services/appointmentsService'
import { ROUTES } from '../../utils/routes'
import styles from './NotificationCenter.module.css'

function buildNotifications() {
  const list = []

  const inventory = getInventory([])
  const outOfStock = inventory.filter((i) => i.status === 'Agotado')
  const lowStock = inventory.filter((i) => i.status === 'Stock bajo')

  outOfStock.forEach((item) => {
    list.push({
      id: `inv-out-${item.id}`,
      type: 'danger',
      title: 'Repuesto agotado',
      message: `${item.code} — ${item.name}`,
      link: ROUTES.adminInventario,
    })
  })

  lowStock.forEach((item) => {
    list.push({
      id: `inv-low-${item.id}`,
      type: 'warning',
      title: 'Stock bajo',
      message: `${item.code} — ${item.name}`,
      link: ROUTES.adminInventario,
    })
  })

  const orders = getOrders([])
  orders
    .filter((o) => o.status === 'Lista para entrega')
    .forEach((o) => {
      list.push({
        id: `ord-ready-${o.id}`,
        type: 'success',
        title: 'Lista para entrega',
        message: `${o.orderNumber} — ${o.clientName}`,
        link: ROUTES.adminOrdenes,
      })
    })

  orders
    .filter((o) => o.status === 'En reparación')
    .slice(0, 3)
    .forEach((o) => {
      list.push({
        id: `ord-repair-${o.id}`,
        type: 'info',
        title: 'En reparación',
        message: `${o.orderNumber} — ${o.clientName}`,
        link: ROUTES.adminOrdenes,
      })
    })

  const appointments = getAppointments([])
  const pending = appointments.filter((a) => a.status === 'Pendiente')
  if (pending.length > 0) {
    list.push({
      id: 'appts-pending',
      type: 'warning',
      title: 'Citas pendientes',
      message: `${pending.length} cita${pending.length > 1 ? 's' : ''} sin confirmar`,
      link: ROUTES.adminCitas,
    })
  }

  return list
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [notifications] = useState(() => buildNotifications())
  const wrapperRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleNavigate(link) {
    navigate(link)
    setOpen(false)
  }

  const count = notifications.length

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        className={styles.bell}
        type="button"
        aria-label={`Notificaciones${count > 0 ? `, ${count} alertas` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20" aria-hidden="true">
          <path fillRule="evenodd" d="M4 8a6 6 0 1 1 12 0c0 1.887.454 3.665 1.257 5.234a.75.75 0 0 1-.515 1.076 32.91 32.91 0 0 1-3.256.508 3.5 3.5 0 0 1-6.972 0 32.903 32.903 0 0 1-3.256-.508.75.75 0 0 1-.515-1.076A11.448 11.448 0 0 0 4 8Zm6 7c-.655 0-1.246-.238-1.692-.63L9.692 15h.616ZM10 2a.75.75 0 0 1 .75.75v.463a6.25 6.25 0 0 1 5.5 6.287A10.95 10.95 0 0 0 17.5 13.5a.75.75 0 0 1-.75.75h-13.5a.75.75 0 0 1-.75-.75c0-1.148.26-2.243.727-3.216A6.25 6.25 0 0 1 9.25 3.213V2.75A.75.75 0 0 1 10 2Z" clipRule="evenodd" />
        </svg>
        {count > 0 ? (
          <span className={styles.badge} aria-hidden="true">
            {count > 9 ? '9+' : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className={styles.dropdown} role="menu" aria-label="Centro de notificaciones">
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownTitle}>Notificaciones</span>
            {count > 0 ? <span className={styles.countChip}>{count}</span> : null}
          </div>

          {notifications.length === 0 ? (
            <p className={styles.empty}>Sin alertas activas</p>
          ) : (
            <div className={styles.list}>
              {notifications.map((n) => (
                <button
                  key={n.id}
                  className={`${styles.item} ${styles[n.type]}`}
                  type="button"
                  role="menuitem"
                  onClick={() => handleNavigate(n.link)}
                >
                  <span className={styles.itemDot} />
                  <div className={styles.itemBody}>
                    <span className={styles.itemTitle}>{n.title}</span>
                    <span className={styles.itemMessage}>{n.message}</span>
                  </div>
                  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" className={styles.itemArrow} aria-hidden="true">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

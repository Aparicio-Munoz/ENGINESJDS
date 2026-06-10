import { useMemo } from 'react'
import { getClients } from '../../../services/clientsService'
import { getEmployees } from '../../../services/employeesService'
import { getInventory } from '../../../services/inventoryService'
import { getMotorcycles } from '../../../services/motorcyclesService'
import { getOrders } from '../../../services/ordersService'
import { getUsers } from '../../../services/usersService'
import { getAppointments } from '../../../services/appointmentsService'
import styles from './Reportes.module.css'

const ORDER_STATUSES = [
  { key: 'Recibida',           color: '#2563EB', bg: '#DBEAFE' },
  { key: 'Diagnóstico',        color: '#D97706', bg: '#FEF3C7' },
  { key: 'En reparación',      color: '#EA580C', bg: '#FFEDD5' },
  { key: 'Lista para entrega', color: '#7C3AED', bg: '#EDE9FE' },
  { key: 'Entregada',          color: '#059669', bg: '#D1FAE5' },
]

const INVENTORY_STATUSES = [
  { key: 'Disponible', color: '#059669', bg: '#D1FAE5' },
  { key: 'Stock bajo', color: '#D97706', bg: '#FEF3C7' },
  { key: 'Agotado',    color: '#DC2626', bg: '#FEE2E2' },
]

function downloadCSV(filename, headers, rows) {
  const csv = [
    headers.join(','),
    ...rows.map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function BarRow({ label, count, total, color }) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100)
  return (
    <div className={styles.barRow}>
      <div className={styles.barMeta}>
        <span className={styles.barLabel}>{label}</span>
        <span className={styles.barCount}>{count}</span>
        <span className={styles.barPct}>{pct}%</span>
      </div>
      <div className={styles.barTrack}>
        <div
          className={styles.barFill}
          style={{ width: `${pct}%`, background: color }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}

function TopList({ title, items, emptyText }) {
  return (
    <div className={styles.topBlock}>
      <h3 className={styles.subTitle}>{title}</h3>
      {items.length === 0 ? (
        <p className={styles.emptyHint}>{emptyText}</p>
      ) : (
        <ol className={styles.topList}>
          {items.map((item, idx) => (
            <li key={item.name} className={styles.topItem}>
              <span className={`${styles.topRank} ${idx === 0 ? styles.rankGold : idx === 1 ? styles.rankSilver : styles.rankBronze}`}>
                {idx + 1}
              </span>
              <div className={styles.topInfo}>
                <span className={styles.topName}>{item.name}</span>
                <div className={styles.topBar}>
                  <div
                    className={styles.topBarFill}
                    style={{ width: `${Math.round((item.count / items[0].count) * 100)}%` }}
                  />
                </div>
              </div>
              <span className={styles.topCount}>{item.count}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export function Reportes() {
  const clients     = useMemo(() => getClients([]), [])
  const motorcycles = useMemo(() => getMotorcycles([]), [])
  const orders      = useMemo(() => getOrders([]), [])
  const inventory   = useMemo(() => getInventory([]), [])
  const employees   = useMemo(() => getEmployees([]), [])
  const users       = useMemo(() => getUsers([]), [])
  const appointments = useMemo(() => getAppointments([]), [])

  const kpis = [
    { label: 'Clientes',     value: clients.length,      icon: '👥', color: '#2563EB' },
    { label: 'Motocicletas', value: motorcycles.length,  icon: '🏍️', color: '#F97316' },
    { label: 'Órdenes',      value: orders.length,       icon: '📋', color: '#7C3AED' },
    { label: 'Repuestos',    value: inventory.length,    icon: '📦', color: '#059669' },
    { label: 'Empleados',    value: employees.length,    icon: '🔧', color: '#0891B2' },
    { label: 'Usuarios',     value: users.length,        icon: '🔑', color: '#64748B' },
    { label: 'Citas',        value: appointments.length, icon: '📅', color: '#D97706' },
  ]

  const orderCounts = useMemo(
    () => ORDER_STATUSES.map((s) => ({ ...s, count: orders.filter((o) => o.status === s.key).length })),
    [orders],
  )

  const inventoryCounts = useMemo(
    () => INVENTORY_STATUSES.map((s) => ({ ...s, count: inventory.filter((i) => i.status === s.key).length })),
    [inventory],
  )

  const topClients = useMemo(() => {
    const map = {}
    orders.forEach((o) => {
      if (o.clientName) map[o.clientName] = (map[o.clientName] || 0) + 1
    })
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [orders])

  const topEmployees = useMemo(() => {
    const map = {}
    orders.forEach((o) => {
      if (o.assignedEmployee) map[o.assignedEmployee] = (map[o.assignedEmployee] || 0) + 1
    })
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [orders])

  function handleExportClients() {
    downloadCSV('clientes_engines_jds.csv',
      ['Nombre', 'Documento', 'Teléfono', 'Correo', 'Dirección'],
      clients.map((c) => [c.name, c.document, c.phone, c.email, c.address]),
    )
  }

  function handleExportInventory() {
    downloadCSV('inventario_engines_jds.csv',
      ['Código', 'Nombre', 'Marca', 'Cantidad', 'Precio', 'Estado'],
      inventory.map((i) => [i.code, i.name, i.brand, i.quantity, i.price, i.status]),
    )
  }

  function handleExportOrders() {
    downloadCSV('ordenes_engines_jds.csv',
      ['Número OT', 'Cliente', 'Motocicleta', 'Empleado', 'Repuesto', 'Costo', 'Fecha', 'Estado'],
      orders.map((o) => [o.orderNumber, o.clientName, o.motorcycle, o.assignedEmployee, o.repuesto, o.costoEstimado, o.entryDate, o.status]),
    )
  }

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Módulo administrativo</p>
          <h1 className={styles.title}>Reportes</h1>
          <p className={styles.subtitle}>Vista consolidada de datos del sistema.</p>
        </div>
        <div className={styles.exportButtons}>
          <button type="button" className={styles.exportBtn} onClick={handleExportClients}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
              <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
            Clientes CSV
          </button>
          <button type="button" className={styles.exportBtn} onClick={handleExportInventory}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
              <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
            Inventario CSV
          </button>
          <button type="button" className={styles.exportBtn} onClick={handleExportOrders}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true">
              <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
            Órdenes CSV
          </button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <article key={kpi.label} className={styles.kpiCard} style={{ '--kpi-color': kpi.color }}>
            <span className={styles.kpiIcon} aria-hidden="true">{kpi.icon}</span>
            <strong className={styles.kpiValue}>{kpi.value}</strong>
            <span className={styles.kpiLabel}>{kpi.label}</span>
          </article>
        ))}
      </div>

      {/* Charts row */}
      <div className={styles.chartsRow}>
        {/* Orders by status */}
        <div className={styles.chartBlock}>
          <h2 className={styles.blockTitle}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path fillRule="evenodd" d="M4 4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-5L9 4H4Z" clipRule="evenodd" />
            </svg>
            Órdenes por estado
          </h2>
          <div className={styles.barList}>
            {orderCounts.map((s) => (
              <BarRow key={s.key} label={s.key} count={s.count} total={orders.length} color={s.color} bg={s.bg} />
            ))}
            {orders.length === 0 ? <p className={styles.emptyHint}>Sin órdenes registradas.</p> : null}
          </div>
        </div>

        {/* Inventory by status */}
        <div className={styles.chartBlock}>
          <h2 className={styles.blockTitle}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path d="M2 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2ZM2 7.5h16l-.811 7.71a2 2 0 0 1-1.99 1.79H4.802a2 2 0 0 1-1.99-1.79L2 7.5Z" />
            </svg>
            Inventario por estado
          </h2>
          <div className={styles.barList}>
            {inventoryCounts.map((s) => (
              <BarRow key={s.key} label={s.key} count={s.count} total={inventory.length} color={s.color} bg={s.bg} />
            ))}
            {inventory.length === 0 ? <p className={styles.emptyHint}>Sin repuestos registrados.</p> : null}
          </div>
        </div>
      </div>

      {/* Top 5 */}
      <div className={styles.chartsRow}>
        <TopList
          title="Top 5 clientes con más órdenes"
          items={topClients}
          emptyText="Sin datos de clientes en órdenes."
        />
        <TopList
          title="Top 5 empleados con más órdenes"
          items={topEmployees}
          emptyText="Sin empleados asignados en órdenes."
        />
      </div>
    </section>
  )
}

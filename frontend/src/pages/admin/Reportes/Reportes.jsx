import { useMemo, useState } from 'react'
import { getClients } from '../../../services/clientsService'
import { getInventory } from '../../../services/inventoryService'
import { getMotorcycles } from '../../../services/motorcyclesService'
import { getOrders } from '../../../services/ordersService'
import { getAppointments } from '../../../services/appointmentsService'
import styles from './Reportes.module.css'

/* ── Helpers ──────────────────────────────────────── */
const TODAY = new Date()

function parseEsCODate(str) {
  if (!str) return null
  const parts = str.split('/')
  if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0])
  const d = new Date(str)
  return isNaN(d) ? null : d
}

function inPeriod(dateStr, period) {
  if (period === 'all') return true
  const d = parseEsCODate(dateStr)
  if (!d) return false
  if (period === 'today') return d.toDateString() === TODAY.toDateString()
  if (period === 'week') {
    const week = new Date(TODAY); week.setDate(TODAY.getDate() - 7)
    return d >= week
  }
  if (period === 'month') return d.getMonth() === TODAY.getMonth() && d.getFullYear() === TODAY.getFullYear()
  return true
}

function fmtCOP(n) {
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

/* ── Reusable sub-components ──────────────────────── */
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

function TopList({ title, items, emptyText, unit = 'órdenes', valueColor }) {
  if (items.length === 0) {
    return (
      <div className={styles.topBlock}>
        <h3 className={styles.subTitle}>{title}</h3>
        <p className={styles.emptyHint}>{emptyText}</p>
      </div>
    )
  }
  return (
    <div className={styles.topBlock}>
      <h3 className={styles.subTitle}>{title}</h3>
      <ol className={styles.topList}>
        {items.map((item, idx) => (
          <li key={item.name} className={styles.topItem}>
            <span className={`${styles.topRank} ${idx === 0 ? styles.rankGold : idx === 1 ? styles.rankSilver : styles.rankBronze}`}>
              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
            </span>
            <div className={styles.topInfo}>
              <span className={styles.topName}>{item.name}</span>
              <div className={styles.topBar}>
                <div className={styles.topBarFill} style={{ width: `${Math.round((item.count / items[0].count) * 100)}%` }} />
              </div>
            </div>
            <span className={styles.topCount} style={valueColor ? { color: valueColor } : {}}>
              {item.displayValue ?? item.count} {unit && <small>{unit}</small>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

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

const PERIODS = [
  { key: 'all',   label: 'General' },
  { key: 'today', label: 'Hoy' },
  { key: 'week',  label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
]

const ORDER_STATUSES = [
  { key: 'Recibida',            color: '#2563EB' },
  { key: 'Diagnóstico',         color: '#D97706' },
  { key: 'En reparación',       color: '#EA580C' },
  { key: 'Lista para entrega',  color: '#7C3AED' },
  { key: 'Entregada',           color: '#059669' },
]

const INVENTORY_STATUSES = [
  { key: 'Disponible', color: '#059669' },
  { key: 'Stock bajo', color: '#D97706' },
  { key: 'Agotado',    color: '#DC2626' },
]

const TECNO_STATUS = {
  Vigente:           { bg: '#D1FAE5', color: '#059669' },
  'Próxima a vencer':{ bg: '#FEF3C7', color: '#D97706' },
  Vencida:           { bg: '#FEE2E2', color: '#DC2626' },
}

function tecnoStatusFromYear(year) {
  const age = TODAY.getFullYear() - parseInt(year || '2020')
  if (age >= 5) return 'Vencida'
  if (age >= 3) return 'Próxima a vencer'
  return 'Vigente'
}

export function Reportes() {
  const [period, setPeriod] = useState('all')

  const clients     = useMemo(() => getClients([]),      [])
  const motorcycles = useMemo(() => getMotorcycles([]),  [])
  const orders      = useMemo(() => getOrders([]),       [])
  const inventory   = useMemo(() => getInventory([]),    [])
  const appointments = useMemo(() => getAppointments([]), [])

  /* ── Filtered data by period ──────────────────── */
  const filteredOrders = useMemo(
    () => orders.filter((o) => inPeriod(o.entryDate, period)),
    [orders, period],
  )
  const filteredAppts = useMemo(
    () => appointments.filter((a) => inPeriod(a.date, period)),
    [appointments, period],
  )

  /* ── Analytical KPIs ──────────────────────────── */
  const completedOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === 'Entregada').length,
    [filteredOrders],
  )
  const totalRevenue = useMemo(
    () => filteredOrders.reduce((sum, o) => {
      const v = parseFloat(String(o.costoEstimado || '').replace(/[^0-9.]/g, '')) || 0
      return sum + v
    }, 0),
    [filteredOrders],
  )
  const attendedClients = useMemo(() => {
    const unique = new Set(filteredOrders.map((o) => o.clientName).filter(Boolean))
    return unique.size
  }, [filteredOrders])

  const partsUsed = useMemo(
    () => filteredOrders.filter((o) => o.repuesto?.trim()).length,
    [filteredOrders],
  )

  /* ── Charts ───────────────────────────────────── */
  const orderCounts = useMemo(
    () => ORDER_STATUSES.map((s) => ({ ...s, count: filteredOrders.filter((o) => o.status === s.key).length })),
    [filteredOrders],
  )

  const inventoryCounts = useMemo(
    () => INVENTORY_STATUSES.map((s) => ({ ...s, count: inventory.filter((i) => i.status === s.key).length })),
    [inventory],
  )

  /* ── Top lists ────────────────────────────────── */
  const topClients = useMemo(() => {
    const map = {}
    filteredOrders.forEach((o) => { if (o.clientName) map[o.clientName] = (map[o.clientName] || 0) + 1 })
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [filteredOrders])

  const topEmployees = useMemo(() => {
    const map = {}
    filteredOrders.forEach((o) => { if (o.assignedEmployee) map[o.assignedEmployee] = (map[o.assignedEmployee] || 0) + 1 })
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [filteredOrders])

  const topParts = useMemo(() => {
    const map = {}
    filteredOrders.forEach((o) => { if (o.repuesto?.trim()) map[o.repuesto] = (map[o.repuesto] || 0) + 1 })
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8)
  }, [filteredOrders])

  /* ── Tecnomecánica ────────────────────────────── */
  const tecnoData = useMemo(() => {
    const rows = motorcycles.map((m) => ({ ...m, tecnoStatus: tecnoStatusFromYear(m.year) }))
    const summary = {
      Vigente:            rows.filter((r) => r.tecnoStatus === 'Vigente').length,
      'Próxima a vencer': rows.filter((r) => r.tecnoStatus === 'Próxima a vencer').length,
      Vencida:            rows.filter((r) => r.tecnoStatus === 'Vencida').length,
    }
    return { rows, summary }
  }, [motorcycles])

  /* ── Exports ──────────────────────────────────── */
  function handleExportClients() {
    downloadCSV('clientes_engines_jds.csv',
      ['Nombre', 'Documento', 'Teléfono', 'Correo', 'Dirección'],
      clients.map((c) => [c.name, c.document, c.phone, c.email, c.address]),
    )
  }
  function handleExportOrders() {
    downloadCSV('ordenes_engines_jds.csv',
      ['Número OT', 'Cliente', 'Motocicleta', 'Empleado', 'Repuesto', 'Costo', 'Fecha', 'Estado'],
      filteredOrders.map((o) => [o.orderNumber, o.clientName, o.motorcycle, o.assignedEmployee, o.repuesto, o.costoEstimado, o.entryDate, o.status]),
    )
  }
  function handleExportInventory() {
    downloadCSV('inventario_engines_jds.csv',
      ['Código', 'Nombre', 'Marca', 'Cantidad', 'Precio', 'Estado'],
      inventory.map((i) => [i.code, i.name, i.brand, i.quantity, i.price, i.status]),
    )
  }

  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? 'General'

  return (
    <section className={styles.page}>

      {/* ── Header ──────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Módulo administrativo</p>
          <h1 className={styles.title}>Reportes</h1>
          <p className={styles.subtitle}>Análisis histórico de actividad del taller.</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.exportBtn} onClick={handleExportClients}>
            <DownloadIcon /> Clientes
          </button>
          <button type="button" className={styles.exportBtn} onClick={handleExportOrders}>
            <DownloadIcon /> Órdenes
          </button>
          <button type="button" className={styles.exportBtn} onClick={handleExportInventory}>
            <DownloadIcon /> Inventario
          </button>
        </div>
      </div>

      {/* ── Period selector ─────────────────────────── */}
      <nav className={styles.periodNav} aria-label="Filtrar por período">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`${styles.periodTab} ${period === p.key ? styles.periodTabActive : ''}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </nav>

      {/* ── Analytical KPIs ─────────────────────────── */}
      <div className={styles.kpiGrid}>
        {[
          { label: 'Servicios completados', value: completedOrders,       color: '#059669', bg: '#D1FAE5', icon: <CheckIcon /> },
          { label: 'Ingresos estimados',    value: fmtCOP(totalRevenue),  color: '#2563EB', bg: '#DBEAFE', icon: <MoneyIcon /> },
          { label: 'Clientes atendidos',    value: attendedClients,        color: '#7C3AED', bg: '#EDE9FE', icon: <UsersIcon /> },
          { label: 'Repuestos utilizados',  value: partsUsed,              color: '#D97706', bg: '#FEF3C7', icon: <BoxIcon /> },
          { label: 'Órdenes en período',    value: filteredOrders.length,  color: '#F97316', bg: '#FFEDD5', icon: <OrderIcon /> },
        ].map((kpi) => (
          <article key={kpi.label} className={styles.kpiCard} style={{ '--kpi-color': kpi.color }}>
            <div className={styles.kpiIconWrap} style={{ background: kpi.bg, color: kpi.color }}>
              {kpi.icon}
            </div>
            <strong className={styles.kpiValue}>{kpi.value}</strong>
            <span className={styles.kpiLabel}>{kpi.label}</span>
            <span className={styles.kpiPeriod}>{periodLabel}</span>
          </article>
        ))}
      </div>

      {/* ── Bar charts ──────────────────────────────── */}
      <div className={styles.chartsRow}>
        <div className={styles.chartBlock}>
          <h2 className={styles.blockTitle}>
            <OrderIcon size={16} /> Órdenes por estado
          </h2>
          <div className={styles.barList}>
            {orderCounts.map((s) => (
              <BarRow key={s.key} label={s.key} count={s.count} total={filteredOrders.length} color={s.color} />
            ))}
            {filteredOrders.length === 0 ? <p className={styles.emptyHint}>Sin órdenes en este período.</p> : null}
          </div>
        </div>

        <div className={styles.chartBlock}>
          <h2 className={styles.blockTitle}>
            <BoxIcon size={16} /> Estado del inventario
          </h2>
          <div className={styles.barList}>
            {inventoryCounts.map((s) => (
              <BarRow key={s.key} label={s.key} count={s.count} total={inventory.length} color={s.color} />
            ))}
            {inventory.length === 0 ? <p className={styles.emptyHint}>Sin repuestos registrados.</p> : null}
          </div>
        </div>
      </div>

      {/* ── Top lists ───────────────────────────────── */}
      <div className={styles.chartsRow}>
        <TopList title="Top 5 clientes con más órdenes" items={topClients} emptyText="Sin datos." unit="" />
        <TopList title="Top 5 empleados por productividad" items={topEmployees} emptyText="Sin empleados asignados." unit="" />
      </div>

      {/* ── Top repuestos ───────────────────────────── */}
      {topParts.length > 0 ? (
        <div className={styles.chartBlock}>
          <h2 className={styles.blockTitle}>
            <BoxIcon size={16} /> Top repuestos más utilizados
          </h2>
          <div className={styles.partsGrid}>
            {topParts.map((p, idx) => (
              <div key={p.name} className={styles.partRow}>
                <span className={styles.partRank} style={{ background: idx < 3 ? ['#FEF3C7','#F1F5F9','#FFEDD5'][idx] : '#F8FAFC', color: idx < 3 ? ['#D97706','#64748B','#EA580C'][idx] : '#94A3B8' }}>
                  {idx + 1}
                </span>
                <span className={styles.partName}>{p.name}</span>
                <div className={styles.partBarWrap}>
                  <div className={styles.partBar} style={{ width: `${Math.round((p.count / topParts[0].count) * 100)}%` }} />
                </div>
                <span className={styles.partCount}>{p.count}×</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Tecnomecánica ───────────────────────────── */}
      <div className={styles.tecnoSection}>
        <div className={styles.tecnoHeader}>
          <h2 className={styles.blockTitle}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
            </svg>
            Revisión técnicomecánica
          </h2>
          <p className={styles.tecnoNote}>Estado estimado según año del vehículo</p>
        </div>

        <div className={styles.tecnoSummary}>
          {Object.entries(TECNO_STATUS).map(([label, style]) => (
            <div key={label} className={styles.tecnoCard} style={{ '--tecno-bg': style.bg, '--tecno-color': style.color }}>
              <strong className={styles.tecnoCount}>{tecnoData.summary[label] ?? 0}</strong>
              <span className={styles.tecnoLabel}>{label}</span>
            </div>
          ))}
        </div>

        {motorcycles.length > 0 ? (
          <div className={styles.tecnoTableWrap}>
            <table className={styles.tecnoTable}>
              <thead>
                <tr>
                  <th>Placa</th>
                  <th>Vehículo</th>
                  <th>Año</th>
                  <th>Propietario</th>
                  <th>Estado técnicomecánica</th>
                </tr>
              </thead>
              <tbody>
                {tecnoData.rows.map((m) => {
                  const s = TECNO_STATUS[m.tecnoStatus]
                  return (
                    <tr key={m.id}>
                      <td data-label="Placa"><span className={styles.plateCode}>{m.plate}</span></td>
                      <td data-label="Vehículo">{m.brand} {m.model}</td>
                      <td data-label="Año">{m.year}</td>
                      <td data-label="Propietario">{m.ownerName}</td>
                      <td data-label="Estado técnicomecánica">
                        <span className={styles.tecnoBadge} style={{ background: s.bg, color: s.color }}>
                          {m.tecnoStatus}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.emptyHint}>Sin motocicletas registradas.</p>
        )}
      </div>

    </section>
  )
}

/* ── Icon components ──────────────────────────────── */
function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13" aria-hidden="true">
      <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
      <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
    </svg>
  )
}
function CheckIcon() { return <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg> }
function MoneyIcon() { return <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M10.75 10.818v2.614A3.13 3.13 0 0 0 11.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 0 0-1.138-.432ZM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 0 0-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.33.576ZM9.25 3.75v.555c-.94.1-1.82.493-2.486 1.177-.43.45-.76.992-.948 1.578C5.722 7.7 5.75 8.138 5.75 8.5c0 .625.288 1.243.79 1.747.326.325.7.573 1.12.748.227.093.468.167.72.224v2.887a3.8 3.8 0 0 1-.72-.317A3.49 3.49 0 0 1 6.31 12.4a.75.75 0 0 0-1.06 1.06c.503.503 1.105.88 1.77 1.14.308.117.63.2.98.25v.4a.75.75 0 0 0 1.5 0v-.44c.972-.12 1.867-.553 2.527-1.247.47-.505.803-1.126.98-1.805.186-.698.18-1.406-.01-2.025-.214-.696-.68-1.33-1.497-1.78-.263-.147-.56-.262-.872-.346V5.69c.39.128.716.343.976.604.16.16.29.334.394.513a.75.75 0 0 0 1.3-.75 4.49 4.49 0 0 0-.65-.845A4.32 4.32 0 0 0 10.75 4.3V3.75a.75.75 0 0 0-1.5 0Z" /></svg> }
function UsersIcon() { return <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 17a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" /></svg> }
function BoxIcon({ size = 16 }) { return <svg viewBox="0 0 20 20" fill="currentColor" width={size} height={size}><path d="M2 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2ZM2 7.5h16l-.811 7.71a2 2 0 0 1-1.99 1.79H4.802a2 2 0 0 1-1.99-1.79L2 7.5Z" /></svg> }
function OrderIcon({ size = 16 }) { return <svg viewBox="0 0 20 20" fill="currentColor" width={size} height={size}><path fillRule="evenodd" d="M4 4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-5L9 4H4Z" clipRule="evenodd" /></svg> }

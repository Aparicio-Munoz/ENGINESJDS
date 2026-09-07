import { useCallback, useEffect, useRef, useState } from 'react'
import { invoicesApi } from '../../../api/invoicesApi'
import { ordersApi } from '../../../api'
import { Pagination } from '../../../components/Pagination/Pagination'
import { useToast } from '../../../hooks/useToast'
import styles from './Facturas.module.css'

const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Tarjeta']
const STATUSES = ['Pendiente', 'Pagada', 'Anulada']

const STATUS_STYLES = {
  Pendiente: { bg: '#FEF3C7', color: '#92400E' },
  Pagada:    { bg: '#D1FAE5', color: '#047857' },
  Anulada:   { bg: '#FEE2E2', color: '#B91C1C' },
}

function fmtCOP(n) {
  if (n === null || n === undefined) return '$ 0'
  return `$ ${Math.round(Number(n)).toLocaleString('es-CO')}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function Facturas() {
  const toast = useToast()
  const mountedRef = useRef(true)
  const searchTimerRef = useRef(null)

  const [invoices, setInvoices] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const [searchInput, setSearchInput] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMethod, setFilterMethod] = useState('')

  const [summary, setSummary] = useState(null)

  // Create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [activeOrders, setActiveOrders] = useState([])
  const [createForm, setCreateForm] = useState({ order_id: '', payment_method: 'Efectivo', notes: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [listRes, summaryRes] = await Promise.all([
        invoicesApi.getAll({ search: searchApplied || undefined, status: filterStatus || undefined, payment_method: filterMethod || undefined, page, limit: 15 }),
        invoicesApi.getDailySummary(),
      ])
      if (!mountedRef.current) return
      setInvoices(listRes.data ?? []); setPagination(listRes.pagination ?? null)
      setSummary(summaryRes)
    } catch { if (mountedRef.current) toast.error('Error al cargar facturas') }
    finally { if (mountedRef.current) setLoading(false) }
  }, [page, searchApplied, filterStatus, filterMethod, toast])

  useEffect(() => {
    const timer = setTimeout(() => loadData(), 0)
    return () => clearTimeout(timer)
  }, [loadData])

  function handleSearch(e) {
    const v = e.target.value; setSearchInput(v)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => { setPage(1); setSearchApplied(v.trim()) }, 400)
  }

  async function openCreate() {
    setCreateForm({ order_id: '', payment_method: 'Efectivo', notes: '' })
    setCreateOpen(true)
    try {
      const res = await ordersApi.getAll({ limit: 100, status: 'Entregada' })
      if (mountedRef.current) setActiveOrders(res.data ?? [])
    } catch {
      if (mountedRef.current) toast.error('Error al cargar las órdenes de trabajo')
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!createForm.order_id) { toast.error('Selecciona una orden'); return }
    setCreating(true)
    try {
      const inv = await invoicesApi.create(createForm)
      toast.success(`Factura ${inv.invoice_number} creada`)
      setCreateOpen(false); loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Error al crear factura')
    } finally { if (mountedRef.current) setCreating(false) }
  }

  async function handlePay(inv) {
    try {
      await invoicesApi.markPaid(inv.id)
      toast.success(`Factura ${inv.invoice_number} marcada como pagada`)
      loadData()
    } catch (err) { toast.error(err?.response?.data?.message ?? 'Error') }
  }

  async function handleCancel(inv) {
    if (!confirm(`¿Anular factura ${inv.invoice_number}?`)) return
    try {
      await invoicesApi.cancel(inv.id)
      toast.success(`Factura ${inv.invoice_number} anulada`)
      loadData()
    } catch (err) { toast.error(err?.response?.data?.message ?? 'Error') }
  }

  async function handlePDF(inv) {
    try { await invoicesApi.downloadPDF(inv.id) } catch { toast.error('Error al descargar PDF') }
  }

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Módulo administrativo</p>
          <h1>Facturación</h1>
          <p>Genera facturas, registra pagos y controla ingresos del taller.</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={openCreate}>
          Nueva factura
        </button>
      </div>

      {/* Daily summary */}
      {summary ? (
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard} style={{ '--sc-color': '#059669' }}>
            <span className={styles.scLabel}>Total pagado hoy</span>
            <strong className={styles.scValue}>{fmtCOP(summary.totalPaid)}</strong>
          </div>
          <div className={styles.summaryCard} style={{ '--sc-color': '#D97706' }}>
            <span className={styles.scLabel}>Pendiente</span>
            <strong className={styles.scValue}>{fmtCOP(summary.totalPending)}</strong>
          </div>
          {Object.entries(summary.byMethod).filter(([, v]) => v > 0).map(([method, amount]) => (
            <div key={method} className={styles.summaryCard} style={{ '--sc-color': '#2563EB' }}>
              <span className={styles.scLabel}>{method}</span>
              <strong className={styles.scValue}>{fmtCOP(amount)}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" /></svg>
          <input className={styles.searchInput} type="search" placeholder="Buscar por factura, cliente u OT…" value={searchInput} onChange={handleSearch} />
        </div>
        <select className={styles.filterSelect} value={filterStatus} onChange={(e) => { setPage(1); setFilterStatus(e.target.value) }}>
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={styles.filterSelect} value={filterMethod} onChange={(e) => { setPage(1); setFilterMethod(e.target.value) }}>
          <option value="">Todos los métodos</option>
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className={styles.loadingState}><div className={styles.spinner} />Cargando facturas…</div>
      ) : invoices.length === 0 ? (
        <div className={styles.emptyState}>No hay facturas registradas.</div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Factura</th>
                  <th>Cliente</th>
                  <th>OT</th>
                  <th>Fecha</th>
                  <th>Método</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const st = STATUS_STYLES[inv.status] ?? {}
                  return (
                    <tr key={inv.id}>
                      <td data-label="Factura"><span className={styles.invoiceNum}>{inv.invoice_number}</span></td>
                      <td data-label="Cliente">{inv.client_name}</td>
                      <td data-label="OT"><span className={styles.orderNum}>{inv.order_number}</span></td>
                      <td data-label="Fecha">{fmtDate(inv.created_at)}</td>
                      <td data-label="Método">{inv.payment_method}</td>
                      <td data-label="Total"><strong>{fmtCOP(inv.total)}</strong></td>
                      <td data-label="Estado">
                        <span className={styles.statusBadge} style={{ background: st.bg, color: st.color }}>{inv.status}</span>
                      </td>
                      <td data-label="Acciones">
                        <div className={styles.actionsCell}>
                          <button className={styles.pdfBtn} type="button" onClick={() => handlePDF(inv)} title="PDF">
                            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" /><path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" /></svg>
                          </button>
                          {inv.status === 'Pendiente' ? (
                            <button className={styles.payBtn} type="button" onClick={() => handlePay(inv)}>Pagar</button>
                          ) : null}
                          {inv.status !== 'Anulada' ? (
                            <button className={styles.cancelBtn} type="button" onClick={() => handleCancel(inv)}>Anular</button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={pagination?.totalPages} total={pagination?.total} onPageChange={setPage} disabled={loading} />
        </>
      )}

      {/* Create modal */}
      {createOpen ? (
        <div className={styles.modalBackdrop}>
          <section className={styles.modal}>
            <div className={styles.modalHeader}>
              <div><p className={styles.eyebrow}>Registro</p><h2>Nueva factura</h2></div>
              <button className={styles.iconButton} type="button" onClick={() => setCreateOpen(false)}>×</button>
            </div>
            <form className={styles.form} onSubmit={handleCreate}>
              <label className={styles.formField}>
                <span>Orden de trabajo <span className={styles.required}>*</span></span>
                <select value={createForm.order_id} onChange={(e) => setCreateForm((p) => ({ ...p, order_id: e.target.value }))}>
                  <option value="">Selecciona una orden…</option>
                  {activeOrders.map((o) => (
                    <option key={o.id} value={o.id}>{o.order_number} — {o.client_name} — {o.motorcycle_plate} — {fmtCOP(o.final_price)}</option>
                  ))}
                </select>
                {activeOrders.length === 0 ? (
                  <span className={styles.fieldHint}>
                    No hay órdenes entregadas listas para facturar. Cierra una orden desde Órdenes de trabajo primero.
                  </span>
                ) : null}
              </label>
              <label className={styles.formField}>
                Método de pago
                <select value={createForm.payment_method} onChange={(e) => setCreateForm((p) => ({ ...p, payment_method: e.target.value }))}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
              <label className={`${styles.formField} ${styles.fullWidth}`}>
                Notas (opcional)
                <textarea rows={2} maxLength={500} value={createForm.notes} onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))} />
              </label>
              <div className={styles.formActions}>
                <button className={styles.secondaryButton} type="button" disabled={creating} onClick={() => setCreateOpen(false)}>Cancelar</button>
                <button className={styles.primaryButton} type="submit" disabled={creating}>{creating ? 'Creando…' : 'Crear factura'}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}

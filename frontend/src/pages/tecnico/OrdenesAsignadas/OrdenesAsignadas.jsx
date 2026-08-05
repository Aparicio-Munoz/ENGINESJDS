import { useCallback, useEffect, useRef, useState } from 'react'
import { technicianApi, ordersApi } from '../../../api'
import { Pagination } from '../../../components/Pagination/Pagination'
import { useToast } from '../../../hooks/useToast'
import styles from './OrdenesAsignadas.module.css'

const TECH_STATUSES = ['Pendiente', 'En reparación', 'Esperando repuesto', 'Lista para entrega']
const ALL_STATUSES  = [...TECH_STATUSES, 'Entregada']

const STATUS_STYLES = {
  Pendiente:            { background: '#dbeafe', color: '#1d4ed8' },
  'En reparación':      { background: '#ffedd5', color: '#9a3412' },
  'Esperando repuesto': { background: '#fef3c7', color: '#92400e' },
  'Lista para entrega': { background: '#ede9fe', color: '#6d28d9' },
  Entregada:            { background: '#d1fae5', color: '#047857' },
  'En proceso':         { background: '#ffedd5', color: '#9a3412' },
  Listo:                { background: '#ede9fe', color: '#6d28d9' },
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO')
}

function formatCurrency(n) {
  if (n === null || n === undefined || n === '') return '—'
  return `$ ${Number(n).toLocaleString('es-CO')}`
}

export function OrdenesAsignadas() {
  const toast = useToast()
  const mountedRef = useRef(true)

  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [searchInput, setSearchInput] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const searchTimerRef = useRef(null)

  const [changingStatusId, setChangingStatusId] = useState(null)

  // Detail
  const [detailTarget, setDetailTarget] = useState(null)
  const [detailHistory, setDetailHistory] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Notes
  const [notesTarget, setNotesTarget] = useState(null)
  const [notesValue, setNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const loadOrders = useCallback(async (opts = {}) => {
    if (!opts.silent) setLoading(true)
    setError(null)
    try {
      const res = await technicianApi.getOrders({
        search: searchApplied || undefined,
        status: filterStatus || undefined,
        page,
        limit: 20,
      })
      if (!mountedRef.current) return
      setOrders(res.data ?? [])
      setPagination(res.pagination ?? null)
    } catch {
      if (!mountedRef.current) return
      setError('No se pudieron cargar las órdenes.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [page, searchApplied, filterStatus])

  useEffect(() => { loadOrders() }, [loadOrders])

  function handleSearchChange(e) {
    const val = e.target.value
    setSearchInput(val)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setPage(1)
      setSearchApplied(val.trim())
    }, 400)
  }

  async function handleChangeStatus(order, newStatus) {
    if (newStatus === order.status) return
    setChangingStatusId(order.id)
    try {
      await technicianApi.updateOrderStatus(order.id, { status: newStatus })
      if (!mountedRef.current) return
      toast.success(`Estado → "${newStatus}"`)
      loadOrders({ silent: true })
      if (detailTarget?.id === order.id) loadDetail(order.id)
    } catch (err) {
      if (!mountedRef.current) return
      toast.error(err?.response?.data?.message ?? 'No se pudo cambiar el estado')
    } finally {
      if (mountedRef.current) setChangingStatusId(null)
    }
  }

  async function loadDetail(id) {
    setDetailLoading(true)
    try {
      const history = await ordersApi.getHistory(id)
      if (mountedRef.current) setDetailHistory(history)
    } catch {
      if (mountedRef.current) toast.error('No se pudo cargar el detalle')
    } finally {
      if (mountedRef.current) setDetailLoading(false)
    }
  }

  async function openDetail(order) {
    setDetailTarget(order)
    setDetailHistory(null)
    await loadDetail(order.id)
  }

  function openNotes(order) {
    setNotesTarget(order)
    setNotesValue(order.work_notes || '')
  }

  async function handleSaveNotes(e) {
    e.preventDefault()
    setSavingNotes(true)
    try {
      await technicianApi.updateOrderNotes(notesTarget.id, { work_notes: notesValue.trim() })
      if (!mountedRef.current) return
      toast.success('Notas actualizadas')
      setNotesTarget(null)
      loadOrders({ silent: true })
      if (detailTarget?.id === notesTarget.id) loadDetail(notesTarget.id)
    } catch (err) {
      if (!mountedRef.current) return
      toast.error(err?.response?.data?.message ?? 'No se pudieron guardar las notas')
    } finally {
      if (mountedRef.current) setSavingNotes(false)
    }
  }

  const totalCount = pagination?.total ?? orders.length

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Panel técnico</p>
          <h1>Mis Órdenes de Trabajo</h1>
          <p>Órdenes asignadas a ti. Actualiza estados y agrega notas técnicas.</p>
        </div>
      </div>

      <div className={styles.summaryBar}>
        <span>{totalCount} órdenes asignadas</span>
        <span>{orders.filter((o) => o.status !== 'Entregada').length} activas</span>
      </div>

      <div className={styles.searchBar}>
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Buscar por OT, cliente o placa…"
            value={searchInput}
            onChange={handleSearchChange}
          />
        </div>
        <select className={styles.filterSelect} value={filterStatus} onChange={(e) => { setPage(1); setFilterStatus(e.target.value) }}>
          <option value="">Todos los estados</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className={styles.loadingState}><div className={styles.spinner} />Cargando órdenes…</div>
      ) : error ? (
        <div className={styles.errorState}>
          <p>{error}</p>
          <button type="button" className={styles.retryButton} onClick={() => loadOrders()}>Reintentar</button>
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Número OT</th>
                  <th>Cliente</th>
                  <th>Motocicleta</th>
                  <th>Total</th>
                  <th>Ingreso</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const isChanging = changingStatusId === order.id
                  const isEntregada = order.status === 'Entregada'

                  return (
                    <tr key={order.id}>
                      <td data-label="OT"><span className={styles.orderNumber}>{order.order_number}</span></td>
                      <td data-label="Cliente">
                        <div>{order.client_name}</div>
                        {order.client_phone ? <div className={styles.subText}>{order.client_phone}</div> : null}
                      </td>
                      <td data-label="Moto">
                        <div className={styles.plateText}>{order.motorcycle_plate}</div>
                        <div className={styles.subText}>{order.motorcycle_brand} {order.motorcycle_model}</div>
                      </td>
                      <td data-label="Total">{formatCurrency(order.final_price)}</td>
                      <td data-label="Ingreso">{formatDate(order.entry_date)}</td>
                      <td data-label="Estado">
                        {isEntregada ? (
                          <span className={styles.statusBadge} style={STATUS_STYLES.Entregada}>Entregada</span>
                        ) : (
                          <select
                            className={styles.statusSelect}
                            style={STATUS_STYLES[order.status] ?? {}}
                            value={order.status}
                            disabled={isChanging}
                            onChange={(e) => handleChangeStatus(order, e.target.value)}
                          >
                            {TECH_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        )}
                      </td>
                      <td data-label="Acciones">
                        <div className={styles.actionsCell}>
                          <button className={styles.detailButton} type="button" onClick={() => openDetail(order)}>Ver</button>
                          {!isEntregada ? (
                            <button className={styles.editButton} type="button" onClick={() => openNotes(order)}>Notas</button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {orders.length === 0 ? (
                  <tr><td colSpan={7} className={styles.emptyState}>
                    {searchInput || filterStatus ? 'Sin resultados para los filtros aplicados.' : 'No tienes órdenes asignadas.'}
                  </td></tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={pagination?.totalPages}
            total={pagination?.total}
            onPageChange={setPage}
            disabled={loading}
          />
        </>
      )}

      {/* Detail modal */}
      {detailTarget ? (
        <div className={`${styles.modalBackdrop} ${styles.detailBackdrop}`}>
          <section className={`${styles.modal} ${styles.detailModal}`}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Detalle de orden</p>
                <h2><span className={styles.orderNumber}>{detailTarget.order_number}</span></h2>
                <p>{detailTarget.client_name} — {detailTarget.motorcycle_plate} {detailTarget.motorcycle_brand}</p>
              </div>
              <button className={styles.iconButton} type="button" onClick={() => { setDetailTarget(null); setDetailHistory(null) }}>×</button>
            </div>

            {detailLoading ? (
              <div className={styles.detailLoading}><div className={styles.spinner} />Cargando detalle…</div>
            ) : detailHistory ? (
              <div className={styles.detailBody}>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Estado</span>
                    <span className={styles.statusBadge} style={STATUS_STYLES[detailHistory.order.status] ?? {}}>{detailHistory.order.status}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Fecha ingreso</span>
                    <span>{formatDate(detailHistory.order.entry_date)}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Total</span>
                    <strong>{formatCurrency(detailHistory.order.final_price)}</strong>
                  </div>
                </div>

                {(detailHistory.order.diagnostic_notes || detailHistory.order.work_notes) ? (
                  <div className={styles.notesSection}>
                    {detailHistory.order.diagnostic_notes ? (
                      <div className={styles.noteBlock}>
                        <span className={styles.detailLabel}>Diagnóstico</span>
                        <p className={styles.noteText}>{detailHistory.order.diagnostic_notes}</p>
                      </div>
                    ) : null}
                    {detailHistory.order.work_notes ? (
                      <div className={styles.noteBlock}>
                        <span className={styles.detailLabel}>Notas técnicas</span>
                        <p className={styles.noteText}>{detailHistory.order.work_notes}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {detailHistory.services?.length > 0 ? (
                  <div className={styles.detailSection}>
                    <h3 className={styles.sectionTitle}>Servicios ({detailHistory.services.length})</h3>
                    <div className={styles.itemList}>
                      {detailHistory.services.map((svc) => (
                        <div key={svc.id} className={styles.itemRow}>
                          <strong>{svc.service_name}</strong>
                          <span className={styles.itemMeta}>x{svc.quantity} × {formatCurrency(svc.unit_price)} = {formatCurrency(svc.total_price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {detailHistory.parts?.length > 0 ? (
                  <div className={styles.detailSection}>
                    <h3 className={styles.sectionTitle}>Repuestos ({detailHistory.parts.length})</h3>
                    <div className={styles.itemList}>
                      {detailHistory.parts.map((part) => (
                        <div key={part.id} className={styles.itemRow}>
                          <strong>{part.part_name}</strong>
                          <span className={styles.itemMeta}>{part.part_code} · x{part.quantity} = {formatCurrency(part.total_price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {detailHistory.status_history?.length > 0 ? (
                  <div className={styles.detailSection}>
                    <h3 className={styles.sectionTitle}>Historial de estados</h3>
                    <div className={styles.historyList}>
                      {detailHistory.status_history.map((h) => (
                        <div key={h.id} className={styles.historyItem}>
                          <span className={styles.historyArrow}>{h.previous_status || '—'} → {h.new_status}</span>
                          <span className={styles.historyMeta}>{h.changed_by_name} · {formatDate(h.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {/* Notes modal */}
      {notesTarget ? (
        <div className={styles.modalBackdrop}>
          <section className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Notas técnicas</p>
                <h2>{notesTarget.order_number}</h2>
              </div>
              <button className={styles.iconButton} type="button" onClick={() => setNotesTarget(null)}>×</button>
            </div>
            <form onSubmit={handleSaveNotes}>
              <label className={styles.formField}>
                Notas de trabajo
                <textarea
                  rows={6}
                  maxLength={2000}
                  placeholder="Describe el trabajo realizado, observaciones, diagnóstico…"
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                />
              </label>
              <div className={styles.formActions}>
                <button className={styles.secondaryButton} type="button" disabled={savingNotes} onClick={() => setNotesTarget(null)}>Cancelar</button>
                <button className={styles.primaryButton} type="submit" disabled={savingNotes}>
                  {savingNotes ? 'Guardando…' : 'Guardar notas'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}

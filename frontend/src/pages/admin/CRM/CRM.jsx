import { useCallback, useEffect, useRef, useState } from 'react'
import { remindersApi } from '../../../api/remindersApi'
import { clientsApi } from '../../../api/clientsApi'
import { Pagination } from '../../../components/Pagination/Pagination'
import { useToast } from '../../../hooks/useToast'
import styles from './CRM.module.css'

const TYPES = ['MANTENIMIENTO', 'SOAT', 'TECNOMECANICA', 'CAMBIO_ACEITE', 'CITA']
const TYPE_LABELS = { MANTENIMIENTO: 'Mantenimiento', SOAT: 'SOAT', TECNOMECANICA: 'Tecnomecánica', CAMBIO_ACEITE: 'Cambio aceite', CITA: 'Cita' }
const TYPE_COLORS = { MANTENIMIENTO: '#2563EB', SOAT: '#059669', TECNOMECANICA: '#7C3AED', CAMBIO_ACEITE: '#F97316', CITA: '#D97706' }
const STATUS_STYLES = { PENDIENTE: { bg: '#FEF3C7', color: '#92400E' }, ENVIADO: { bg: '#D1FAE5', color: '#047857' }, CANCELADO: { bg: '#FEE2E2', color: '#B91C1C' } }

function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) }

export function CRM() {
  const toast = useToast()
  const mountedRef = useRef(true)
  const searchTimerRef = useRef(null)

  const [reminders, setReminders] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState(null)

  const [searchInput, setSearchInput] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Create
  const [createOpen, setCreateOpen] = useState(false)
  const [clients, setClients] = useState([])
  const [form, setForm] = useState({ client_id: '', motorcycle_id: '', type: 'MANTENIMIENTO', message: '', scheduled_date: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [listRes, dashRes] = await Promise.all([
        remindersApi.getAll({ search: searchApplied || undefined, type: filterType || undefined, status: filterStatus || undefined, page, limit: 15 }),
        remindersApi.getDashboard(),
      ])
      if (!mountedRef.current) return
      setReminders(listRes.data ?? []); setPagination(listRes.pagination ?? null)
      setDashboard(dashRes)
    } catch { if (mountedRef.current) toast.error('Error cargando CRM') }
    finally { if (mountedRef.current) setLoading(false) }
  }, [page, searchApplied, filterType, filterStatus])

  useEffect(() => { loadData() }, [loadData])

  function handleSearch(e) {
    const v = e.target.value; setSearchInput(v)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => { setPage(1); setSearchApplied(v.trim()) }, 400)
  }

  async function openCreate() {
    setForm({ client_id: '', motorcycle_id: '', type: 'MANTENIMIENTO', message: '', scheduled_date: '' })
    setCreateOpen(true)
    try { const res = await clientsApi.getAll({ limit: 200 }); if (mountedRef.current) setClients(res.data ?? []) } catch {}
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.client_id || !form.message.trim() || !form.scheduled_date) { toast.error('Completa todos los campos requeridos'); return }
    setCreating(true)
    try {
      await remindersApi.create({ ...form, client_id: Number(form.client_id), motorcycle_id: form.motorcycle_id ? Number(form.motorcycle_id) : undefined })
      toast.success('Recordatorio creado'); setCreateOpen(false); loadData()
    } catch (err) { toast.error(err?.response?.data?.message ?? 'Error') }
    finally { if (mountedRef.current) setCreating(false) }
  }

  async function handleSend(r) {
    try {
      const result = await remindersApi.send(r.id)
      toast.success(`Recordatorio enviado a ${r.client_name}`)
      if (result.whatsapp_url) window.open(result.whatsapp_url, '_blank')
      loadData()
    } catch (err) { toast.error(err?.response?.data?.message ?? 'Error al enviar') }
  }

  async function handleDelete(r) {
    if (!confirm(`¿Eliminar recordatorio para ${r.client_name}?`)) return
    try { await remindersApi.remove(r.id); toast.success('Eliminado'); loadData() }
    catch (err) { toast.error(err?.response?.data?.message ?? 'Error') }
  }

  const stats = dashboard?.stats

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>CRM</p>
          <h1>Recordatorios y Retención</h1>
          <p>Mantén contacto con tus clientes y aumenta las visitas al taller.</p>
        </div>
        <button className={styles.primaryButton} onClick={openCreate}>Nuevo recordatorio</button>
      </div>

      {/* KPIs */}
      {stats ? (
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard} style={{ '--kpi-color': '#F97316' }}>
            <span className={styles.kpiLabel}>Recordatorios pendientes</span>
            <strong className={styles.kpiValue}>{stats.pendingReminders}</strong>
          </div>
          <div className={styles.kpiCard} style={{ '--kpi-color': '#059669' }}>
            <span className={styles.kpiLabel}>Clientes recurrentes (6m)</span>
            <strong className={styles.kpiValue}>{stats.recurringClients}</strong>
          </div>
          <div className={styles.kpiCard} style={{ '--kpi-color': '#DC2626' }}>
            <span className={styles.kpiLabel}>Clientes inactivos</span>
            <strong className={styles.kpiValue}>{stats.inactiveClients}</strong>
          </div>
        </div>
      ) : null}

      {/* Upcoming + Inactive */}
      <div className={styles.cardsRow}>
        {dashboard?.upcoming?.length ? (
          <div className={styles.glassCard}>
            <h3 className={styles.cardTitle}>Próximos mantenimientos</h3>
            <div className={styles.cardList}>
              {dashboard.upcoming.map((m) => (
                <div key={m.motorcycle_id} className={styles.cardItem}>
                  <div className={styles.cardItemInfo}>
                    <strong>{m.plate} — {m.brand} {m.model}</strong>
                    <span>{m.client_name} · {m.days_since} días sin servicio</span>
                  </div>
                  <a className={styles.waLink} href={`https://wa.me/57${(m.phone||'').replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {dashboard?.inactive?.length ? (
          <div className={styles.glassCard}>
            <h3 className={styles.cardTitle}>Clientes inactivos (+90 días)</h3>
            <div className={styles.cardList}>
              {dashboard.inactive.slice(0, 6).map((c) => (
                <div key={c.id} className={styles.cardItem}>
                  <div className={styles.cardItemInfo}>
                    <strong>{c.client_name}</strong>
                    <span>{c.total_orders} visitas · {c.days_since ? `${c.days_since} días` : 'Sin visitas'}</span>
                  </div>
                  {c.phone ? <a className={styles.waLink} href={`https://wa.me/57${c.phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer">WhatsApp</a> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" /></svg>
          <input className={styles.searchInput} type="search" placeholder="Buscar por cliente o placa…" value={searchInput} onChange={handleSearch} />
        </div>
        <select className={styles.filterSelect} value={filterType} onChange={(e) => { setPage(1); setFilterType(e.target.value) }}>
          <option value="">Todos los tipos</option>
          {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <select className={styles.filterSelect} value={filterStatus} onChange={(e) => { setPage(1); setFilterStatus(e.target.value) }}>
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="ENVIADO">Enviado</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      {/* Reminders table */}
      {loading ? (
        <div className={styles.loadingState}><div className={styles.spinner} />Cargando…</div>
      ) : reminders.length === 0 ? (
        <div className={styles.emptyState}>No hay recordatorios registrados.</div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead><tr><th>Cliente</th><th>Moto</th><th>Tipo</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {reminders.map((r) => {
                  const st = STATUS_STYLES[r.status] ?? {}
                  return (
                    <tr key={r.id}>
                      <td data-label="Cliente"><strong>{r.client_name}</strong><br /><span className={styles.subText}>{r.client_phone}</span></td>
                      <td data-label="Moto">{r.plate ? `${r.plate} ${r.moto_brand ?? ''}` : '—'}</td>
                      <td data-label="Tipo"><span className={styles.typeBadge} style={{ color: TYPE_COLORS[r.type] ?? '#64748B' }}>{TYPE_LABELS[r.type] ?? r.type}</span></td>
                      <td data-label="Fecha">{fmtDate(r.scheduled_date)}</td>
                      <td data-label="Estado"><span className={styles.statusBadge} style={{ background: st.bg, color: st.color }}>{r.status}</span></td>
                      <td data-label="Acciones">
                        <div className={styles.actionsCell}>
                          {r.status === 'PENDIENTE' ? <button className={styles.sendBtn} onClick={() => handleSend(r)}>Enviar</button> : null}
                          <button className={styles.deleteBtn} onClick={() => handleDelete(r)}>Eliminar</button>
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
              <div><p className={styles.eyebrow}>Nuevo</p><h2>Crear recordatorio</h2></div>
              <button className={styles.iconButton} onClick={() => setCreateOpen(false)}>×</button>
            </div>
            <form className={styles.form} onSubmit={handleCreate}>
              <label className={styles.formField}>
                Cliente <span className={styles.required}>*</span>
                <select value={form.client_id} onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))}>
                  <option value="">Selecciona…</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name} {c.last_name} — {c.phone}</option>)}
                </select>
              </label>
              <label className={styles.formField}>
                Tipo
                <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                  {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </label>
              <label className={styles.formField}>
                Fecha programada <span className={styles.required}>*</span>
                <input type="date" value={form.scheduled_date} onChange={(e) => setForm((p) => ({ ...p, scheduled_date: e.target.value }))} />
              </label>
              <label className={`${styles.formField} ${styles.fullWidth}`}>
                Mensaje <span className={styles.required}>*</span>
                <textarea rows={4} maxLength={500} placeholder="Hola, te recordamos que tu motocicleta tiene pendiente…" value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} />
              </label>
              <div className={styles.formActions}>
                <button className={styles.secondaryButton} type="button" disabled={creating} onClick={() => setCreateOpen(false)}>Cancelar</button>
                <button className={styles.primaryButton} type="submit" disabled={creating}>{creating ? 'Creando…' : 'Crear'}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}

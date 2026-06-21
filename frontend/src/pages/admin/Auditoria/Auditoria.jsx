import { useCallback, useEffect, useRef, useState } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { reportsApi } from '../../../api/reportsApi'
import { usersApi } from '../../../api/usersApi'
import { Pagination } from '../../../components/Pagination/Pagination'
import styles from './Auditoria.module.css'

const ACTION_LABELS = {
  CREAR_CLIENTE:        'Crear cliente',
  EDITAR_CLIENTE:       'Editar cliente',
  ELIMINAR_CLIENTE:     'Eliminar cliente',
  CREAR_MOTO:          'Crear moto',
  EDITAR_MOTO:         'Editar moto',
  ELIMINAR_MOTO:       'Eliminar moto',
  CREAR_ORDEN:         'Crear orden',
  CAMBIAR_ESTADO:      'Cambiar estado',
  EDITAR_INVENTARIO:   'Editar inventario',
  ELIMINAR_REPUESTO:   'Eliminar repuesto',
  CREAR_EMPLEADO:      'Crear empleado',
  CREAR_MARCA:         'Crear marca',
  EDITAR_MARCA:        'Editar marca',
  ELIMINAR_MARCA:      'Eliminar marca',
  LOGIN_EXITOSO:       'Login exitoso',
  LOGIN_FALLIDO:       'Login fallido',
  IP_BLOQUEADA:        'IP bloqueada',
  LOGOUT:              'Cierre de sesión',
  CAMBIO_CONTRASENA:   'Cambio contraseña',
  RECUPERACION_CONTRASENA: 'Recuperar clave',
}

const ACTION_COLORS = {
  CREAR_CLIENTE: '#059669', EDITAR_CLIENTE: '#2563EB', ELIMINAR_CLIENTE: '#DC2626',
  CREAR_MOTO: '#059669', EDITAR_MOTO: '#2563EB', ELIMINAR_MOTO: '#DC2626',
  CREAR_ORDEN: '#059669', CAMBIAR_ESTADO: '#D97706',
  EDITAR_INVENTARIO: '#2563EB', ELIMINAR_REPUESTO: '#DC2626',
  CREAR_EMPLEADO: '#059669',
  CREAR_MARCA: '#059669', EDITAR_MARCA: '#2563EB', ELIMINAR_MARCA: '#DC2626',
  LOGIN_EXITOSO: '#059669', LOGIN_FALLIDO: '#DC2626', IP_BLOQUEADA: '#DC2626',
  LOGOUT: '#64748B', CAMBIO_CONTRASENA: '#7C3AED', RECUPERACION_CONTRASENA: '#D97706',
}

const MODULE_LABELS = {
  clients: 'Clientes', motorcycles: 'Motocicletas', orders: 'Órdenes',
  inventory: 'Inventario', employees: 'Empleados', brands: 'Marcas',
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function Auditoria() {
  const mountedRef = useRef(true)
  const searchTimerRef = useRef(null)

  const [logs, setLogs] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [users, setUsers] = useState([])
  const [actions, setActions] = useState([])
  const [tables, setTables] = useState([])

  const [searchInput, setSearchInput] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterTable, setFilterTable] = useState('')

  useEffect(() => {
    mountedRef.current = true
    Promise.all([
      usersApi.getAll({ limit: 200 }).then((r) => r.data ?? []),
      reportsApi.getAuditActions().then((r) => r ?? []),
      reportsApi.getAuditTables().then((r) => r ?? []),
    ]).then(([u, a, t]) => {
      if (mountedRef.current) { setUsers(u); setActions(a); setTables(t) }
    }).catch(() => {})
    return () => { mountedRef.current = false }
  }, [])

  const loadLogs = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await reportsApi.getAuditLogs({
        search:     searchApplied || undefined,
        date_from:  dateFrom || undefined,
        date_to:    dateTo || undefined,
        user_id:    filterUser || undefined,
        action:     filterAction || undefined,
        table_name: filterTable || undefined,
        page, limit: 20,
      })
      if (!mountedRef.current) return
      setLogs(res.data ?? [])
      setPagination(res.pagination ?? null)
    } catch {
      if (!mountedRef.current) return
      setError('No se pudo cargar la auditoría.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [page, searchApplied, dateFrom, dateTo, filterUser, filterAction, filterTable])

  useEffect(() => { loadLogs() }, [loadLogs])

  function handleSearchChange(e) {
    const val = e.target.value
    setSearchInput(val)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => { setPage(1); setSearchApplied(val.trim()) }, 400)
  }

  function clearFilters() {
    setPage(1); setSearchInput(''); setSearchApplied(''); setDateFrom(''); setDateTo('')
    setFilterUser(''); setFilterAction(''); setFilterTable('')
  }

  const hasFilters = searchApplied || dateFrom || dateTo || filterUser || filterAction || filterTable

  function handleExportExcel() {
    if (!logs.length) return
    const data = logs.map((r) => ({
      Fecha: fmtDate(r.created_at),
      Usuario: r.user_name ?? '—',
      Rol: r.role ?? '—',
      Acción: ACTION_LABELS[r.action] ?? r.action,
      Módulo: MODULE_LABELS[r.table_name] ?? r.table_name ?? '—',
      'ID Registro': r.record_id ?? '—',
      Descripción: r.description ?? '—',
      IP: r.ip_address ?? '—',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoría')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'ENGINES_JDS_Auditoria.xlsx')
  }

  function handleExportPDF() {
    if (!logs.length) return
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(16); doc.setTextColor(15, 23, 42)
    doc.text('ENGINES JDS — Auditoría', 14, 16)
    doc.setFontSize(9); doc.setTextColor(100, 116, 139)
    doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 14, 23)
    autoTable(doc, {
      startY: 28,
      head: [['Fecha', 'Usuario', 'Rol', 'Acción', 'Módulo', 'ID', 'Descripción', 'IP']],
      body: logs.map((r) => [
        fmtDate(r.created_at), r.user_name ?? '—', r.role ?? '—',
        ACTION_LABELS[r.action] ?? r.action,
        MODULE_LABELS[r.table_name] ?? r.table_name ?? '—',
        r.record_id ?? '—', r.description ?? '—', r.ip_address ?? '—',
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    })
    doc.save('ENGINES_JDS_Auditoria.pdf')
  }

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Módulo administrativo</p>
          <h1>Auditoría</h1>
          <p>Registro de todas las acciones realizadas en el sistema.</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.exportBtn} onClick={handleExportPDF} disabled={!logs.length}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" /><path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" /></svg>
            PDF
          </button>
          <button type="button" className={styles.exportBtn} onClick={handleExportExcel} disabled={!logs.length}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" /><path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" /></svg>
            Excel
          </button>
        </div>
      </div>

      <div className={styles.summaryBar}>
        <span>{loading ? '…' : `${pagination?.total ?? 0} registro(s) de auditoría`}</span>
      </div>

      {/* Search + filters */}
      <div className={styles.filtersSection}>
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" /></svg>
          <input className={styles.searchInput} type="search" placeholder="Buscar por usuario, descripción, módulo…" value={searchInput} onChange={handleSearchChange} />
        </div>
        <div className={styles.filterRow}>
          <label className={styles.filterField}><span>Desde</span><input type="date" value={dateFrom} onChange={(e) => { setPage(1); setDateFrom(e.target.value) }} /></label>
          <label className={styles.filterField}><span>Hasta</span><input type="date" value={dateTo} onChange={(e) => { setPage(1); setDateTo(e.target.value) }} /></label>
          <label className={styles.filterField}>
            <span>Usuario</span>
            <select value={filterUser} onChange={(e) => { setPage(1); setFilterUser(e.target.value) }}>
              <option value="">Todos</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.username} ({u.role})</option>)}
            </select>
          </label>
          <label className={styles.filterField}>
            <span>Acción</span>
            <select value={filterAction} onChange={(e) => { setPage(1); setFilterAction(e.target.value) }}>
              <option value="">Todas</option>
              {actions.map((a) => <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>)}
            </select>
          </label>
          <label className={styles.filterField}>
            <span>Módulo</span>
            <select value={filterTable} onChange={(e) => { setPage(1); setFilterTable(e.target.value) }}>
              <option value="">Todos</option>
              {tables.map((t) => <option key={t} value={t}>{MODULE_LABELS[t] ?? t}</option>)}
            </select>
          </label>
          {hasFilters ? <button type="button" className={styles.clearBtn} onClick={clearFilters}>Limpiar</button> : null}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className={styles.loadingState}><div className={styles.spinner} />Cargando auditoría…</div>
      ) : error ? (
        <div className={styles.errorState}><p>{error}</p><button type="button" className={styles.retryButton} onClick={loadLogs}>Reintentar</button></div>
      ) : logs.length === 0 ? (
        <div className={styles.emptyState}>{hasFilters ? 'Sin resultados para los filtros aplicados.' : 'Sin registros de auditoría.'}</div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Acción</th>
                  <th>Módulo</th>
                  <th>Descripción</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => {
                  const color = ACTION_COLORS[row.action] ?? '#64748B'
                  return (
                    <tr key={row.id}>
                      <td data-label="Fecha">{fmtDate(row.created_at)}</td>
                      <td data-label="Usuario"><strong>{row.user_name ?? '—'}</strong></td>
                      <td data-label="Rol"><span className={styles.roleBadge}>{row.role ?? '—'}</span></td>
                      <td data-label="Acción">
                        <span className={styles.actionBadge} style={{ background: `${color}18`, color }}>
                          {ACTION_LABELS[row.action] ?? row.action}
                        </span>
                      </td>
                      <td data-label="Módulo">
                        {row.table_name ? (
                          <span>{MODULE_LABELS[row.table_name] ?? row.table_name}{row.record_id ? ` #${row.record_id}` : ''}</span>
                        ) : '—'}
                      </td>
                      <td data-label="Descripción"><span className={styles.descText}>{row.description ?? '—'}</span></td>
                      <td data-label="IP"><span className={styles.ipText}>{row.ip_address ?? '—'}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={pagination?.totalPages} total={pagination?.total} onPageChange={setPage} disabled={loading} />
        </>
      )}
    </section>
  )
}

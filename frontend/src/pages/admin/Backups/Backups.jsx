import { useCallback, useEffect, useRef, useState } from 'react'
import { backupsApi } from '../../../api/backupsApi'
import { Pagination } from '../../../components/Pagination/Pagination'
import { useToast } from '../../../hooks/useToast'
import styles from './Backups.module.css'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtSize(kb) {
  if (!kb) return '0 KB'
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${kb} KB`
}

export function Backups() {
  const toast = useToast()
  const mountedRef = useRef(true)
  const fileInputRef = useRef(null)

  const [backups, setBackups] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Restore modal
  const [restoreModal, setRestoreModal] = useState(false)
  const [restoreFile, setRestoreFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [listRes, statsRes] = await Promise.all([
        backupsApi.getAll({ page, limit: 10 }),
        backupsApi.getStats(),
      ])
      if (!mountedRef.current) return
      setBackups(listRes.data ?? [])
      setPagination(listRes.pagination ?? null)
      setStats(statsRes)
    } catch {
      if (mountedRef.current) toast.error('Error al cargar respaldos')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [page])

  useEffect(() => { loadData() }, [loadData])

  async function handleCreate() {
    setCreating(true)
    try {
      const backup = await backupsApi.create()
      toast.success(`Respaldo "${backup.filename}" creado (${fmtSize(backup.size_kb)})`)
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Error al crear el respaldo')
    } finally {
      if (mountedRef.current) setCreating(false)
    }
  }

  async function handleDownload(backup) {
    try {
      await backupsApi.download(backup.id)
      toast.success(`Descargando ${backup.filename}`)
    } catch {
      toast.error('Error al descargar el respaldo')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await backupsApi.remove(deleteTarget.id)
      toast.success(`Respaldo "${deleteTarget.filename}" eliminado`)
      setDeleteTarget(null)
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Error al eliminar')
    } finally {
      if (mountedRef.current) setDeleting(false)
    }
  }

  // ── Restore ────────────────────────────────────────────
  function handleFileDrop(e) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) setRestoreFile(file)
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (file) setRestoreFile(file)
  }

  async function handleRestore() {
    if (!restoreFile) return
    setRestoring(true)
    try {
      await backupsApi.restore(restoreFile)
      toast.success('Base de datos restaurada exitosamente')
      setRestoreModal(false); setRestoreFile(null)
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Error al restaurar')
    } finally {
      if (mountedRef.current) setRestoring(false)
    }
  }

  return (
    <section className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Módulo administrativo</p>
          <h1>Respaldos</h1>
          <p>Crea, descarga y restaura respaldos de la base de datos.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.primaryButton} type="button" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creando…' : 'Crear respaldo'}
          </button>
          <button className={styles.secondaryButton} type="button" onClick={() => { setRestoreModal(true); setRestoreFile(null) }}>
            Restaurar
          </button>
        </div>
      </div>

      {/* Stats cards */}
      {stats ? (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Último respaldo</span>
            <strong className={styles.statValue}>{stats.lastBackupAt ? fmtDate(stats.lastBackupAt) : 'Nunca'}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total respaldos</span>
            <strong className={styles.statValue}>{stats.totalBackups}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Espacio usado</span>
            <strong className={styles.statValue}>{fmtSize(stats.totalSizeKb)}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Último estado</span>
            <strong className={`${styles.statValue} ${stats.lastStatus === 'SUCCESS' ? styles.statusOk : styles.statusFail}`}>
              {stats.lastStatus ?? '—'}
            </strong>
          </div>
        </div>
      ) : null}

      {/* Table */}
      {loading ? (
        <div className={styles.loadingState}><div className={styles.spinner} />Cargando respaldos…</div>
      ) : backups.length === 0 ? (
        <div className={styles.emptyState}>No hay respaldos registrados. Crea el primero.</div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Archivo</th>
                  <th>Tamaño</th>
                  <th>Usuario</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.id}>
                    <td data-label="Fecha">{fmtDate(b.created_at)}</td>
                    <td data-label="Archivo"><span className={styles.filename}>{b.filename}</span></td>
                    <td data-label="Tamaño">{fmtSize(b.size_kb)}</td>
                    <td data-label="Usuario">{b.created_by_name ?? '—'}</td>
                    <td data-label="Estado">
                      <span className={`${styles.statusBadge} ${b.status === 'SUCCESS' ? styles.statusOk : styles.statusFail}`}>
                        {b.status === 'SUCCESS' ? 'Exitoso' : 'Fallido'}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div className={styles.actionsCell}>
                        {b.status === 'SUCCESS' ? (
                          <button className={styles.downloadBtn} type="button" onClick={() => handleDownload(b)}>Descargar</button>
                        ) : null}
                        <button className={styles.deleteBtn} type="button" onClick={() => setDeleteTarget(b)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={pagination?.totalPages} total={pagination?.total} onPageChange={setPage} disabled={loading} />
        </>
      )}

      {/* Delete modal */}
      {deleteTarget ? (
        <div className={styles.modalBackdrop}>
          <section className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Eliminar respaldo</h2>
              <button className={styles.iconButton} type="button" onClick={() => !deleting && setDeleteTarget(null)}>×</button>
            </div>
            <p className={styles.modalText}>
              ¿Eliminar <strong>{deleteTarget.filename}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.secondaryButton} type="button" disabled={deleting} onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className={styles.dangerButton} type="button" disabled={deleting} onClick={handleDelete}>
                {deleting ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {/* Restore modal */}
      {restoreModal ? (
        <div className={styles.modalBackdrop}>
          <section className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Restauración</p>
                <h2>Restaurar base de datos</h2>
              </div>
              <button className={styles.iconButton} type="button" onClick={() => !restoring && setRestoreModal(false)}>×</button>
            </div>

            <div
              className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".sql" className={styles.hiddenInput} onChange={handleFileSelect} />
              {restoreFile ? (
                <div className={styles.fileInfo}>
                  <svg viewBox="0 0 20 20" fill="currentColor" width="24" height="24" className={styles.fileIcon}>
                    <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <strong>{restoreFile.name}</strong>
                    <span className={styles.fileMeta}>{fmtSize(Math.round(restoreFile.size / 1024))}</span>
                  </div>
                  <button type="button" className={styles.fileRemove} onClick={(e) => { e.stopPropagation(); setRestoreFile(null) }}>×</button>
                </div>
              ) : (
                <div className={styles.dropPrompt}>
                  <svg viewBox="0 0 20 20" fill="currentColor" width="32" height="32" className={styles.dropIcon}>
                    <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
                    <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                  </svg>
                  <p>Arrastra un archivo .sql aquí</p>
                  <span>o haz click para seleccionar</span>
                </div>
              )}
            </div>

            <p className={styles.restoreWarn}>
              Esta acción sobrescribirá los datos actuales de la base de datos.
            </p>

            <div className={styles.modalActions}>
              <button className={styles.secondaryButton} type="button" disabled={restoring} onClick={() => setRestoreModal(false)}>Cancelar</button>
              <button className={styles.dangerButton} type="button" disabled={!restoreFile || restoring} onClick={handleRestore}>
                {restoring ? 'Restaurando…' : 'Restaurar'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
